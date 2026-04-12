import json
import re
from urllib.parse import urlparse

import scrapy

from scrapy_no_website_business.items import DirectoryBusinessItem


class NoWebsiteDirectorySpider(scrapy.Spider):
    name = "no_website_directory"
    allowed_domains = []

    custom_settings = {
        "LOG_LEVEL": "INFO",
    }

    EMAIL_REGEX = re.compile(
        r"(?i)(?<![a-z0-9._%+-])[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}(?![a-z0-9._%+-])"
    )

    OBFUSCATION_REGEXES = [
        (re.compile(r"(?i)\s*\[\s*at\s*\]\s*"), "@"),
        (re.compile(r"(?i)\s*\(\s*at\s*\)\s*"), "@"),
        (re.compile(r"(?i)\s+at\s+"), "@"),
        (re.compile(r"(?i)\s*\[\s*dot\s*\]\s*"), "."),
        (re.compile(r"(?i)\s*\(\s*dot\s*\)\s*"), "."),
        (re.compile(r"(?i)\s+dot\s+"), "."),
        (re.compile(r"(?i)\s+arrobase\s+"), "@"),
    ]

    LISTING_BLOCK_SELECTORS = [
        "article",
        "li[class*='result']",
        "li[class*='listing']",
        "div[class*='result']",
        "div[class*='listing']",
        "div[data-result-id]",
    ]

    PAGINATION_SELECTORS = [
        "a[rel='next']::attr(href)",
        "a[aria-label*='Suivant' i]::attr(href)",
        "a[aria-label*='Next' i]::attr(href)",
        "a.next::attr(href)",
    ]
    WEBSITE_SELECTORS = (
        "a[itemprop='url']::attr(href), "
        "a[class*='site']::attr(href), "
        "a[class*='web']::attr(href), "
        "a[aria-label*='site' i]::attr(href), "
        "a[aria-label*='website' i]::attr(href)"
    )

    def __init__(self, start_urls=None, allowed_domains=None, max_pages=20, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if start_urls:
            self.start_urls = [u.strip() for u in start_urls.split(",") if u.strip()]
        else:
            self.start_urls = []

        if allowed_domains:
            self.allowed_domains = [d.strip() for d in allowed_domains.split(",") if d.strip()]
        elif self.start_urls:
            self.allowed_domains = sorted(
                {
                    urlparse(url).netloc.replace("www.", "")
                    for url in self.start_urls
                    if urlparse(url).netloc
                }
            )

        self.max_pages = int(max_pages)

    def start_requests(self):
        if not self.start_urls:
            raise ValueError(
                "Provide at least one URL with -a start_urls='https://example.com/search?q=boulangerie'"
            )
        for url in self.start_urls:
            yield scrapy.Request(url, callback=self.parse, meta={"page_index": 1})

    def parse(self, response):
        page_index = response.meta.get("page_index", 1)

        for block in self._iter_listing_blocks(response):
            item = self._item_from_block(block, response)
            if not item:
                continue

            detail_link = block.css("a::attr(href)").get()
            if detail_link:
                yield response.follow(
                    detail_link,
                    callback=self.parse_detail,
                    meta={"seed_item": dict(item)},
                )
            else:
                if not item.get("website"):
                    yield item

        if page_index < self.max_pages:
            for selector in self.PAGINATION_SELECTORS:
                next_url = response.css(selector).get()
                if next_url:
                    yield response.follow(next_url, callback=self.parse, meta={"page_index": page_index + 1})
                    break

    def parse_detail(self, response):
        item = DirectoryBusinessItem(response.meta.get("seed_item") or {})

        website = item.get("website") or response.css(self.WEBSITE_SELECTORS).get(default="").strip()
        if website and not self._looks_like_website(website):
            website = ""

        if website:
            return

        page_text = " ".join(response.xpath("//body//text()[normalize-space()]").getall())
        json_ld_text = " ".join(self._extract_json_ld_chunks(response))
        contact_text = " ".join(
            response.css(
                "[class*='contact'], [class*='description'], [itemprop='description']"
            ).xpath(".//text()[normalize-space()]").getall()
        )

        emails = self._extract_emails(" ".join([item.get("description", ""), contact_text, page_text, json_ld_text]))

        item["source_url"] = response.url
        item["emails"] = sorted(set((item.get("emails") or []) + emails))
        yield item

    def _iter_listing_blocks(self, response):
        for selector in self.LISTING_BLOCK_SELECTORS:
            blocks = response.css(selector)
            if len(blocks) > 0:
                return blocks
        return []

    def _item_from_block(self, block, response):
        name = (
            block.css("h1::text, h2::text, h3::text, [class*='title']::text, a::text").get() or ""
        ).strip()
        description = " ".join(block.xpath(".//text()[normalize-space()]").getall())

        website = block.css(self.WEBSITE_SELECTORS).get(default="").strip()
        if website and not self._looks_like_website(website):
            website = ""

        email_sources = " ".join(
            filter(
                None,
                [
                    description,
                    " ".join(block.css("a[href^='mailto:']::attr(href)").getall()),
                    " ".join(block.css("[class*='mail'], [data-email]::text").getall()),
                ],
            )
        )

        item = DirectoryBusinessItem()
        item["listing_url"] = response.url
        item["source_url"] = response.url
        item["name"] = name
        item["address"] = (
            block.css("[class*='address']::text, [itemprop='address']::text").get(default="").strip()
        )
        item["phone"] = (
            block.css("a[href^='tel:']::attr(href), [class*='phone']::text").get(default="").strip()
        )
        item["website"] = website
        item["description"] = description.strip()
        item["emails"] = self._extract_emails(email_sources)

        if item["website"]:
            return None
        return item

    def _extract_json_ld_chunks(self, response):
        chunks = []
        for raw in response.css("script[type='application/ld+json']::text").getall():
            raw = (raw or "").strip()
            if not raw:
                continue
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                chunks.append(raw)
                continue
            chunks.append(json.dumps(payload, ensure_ascii=False))
        return chunks

    def _extract_emails(self, text):
        text = text or ""
        normalized = text.replace("mailto:", " ")
        for regex, replacement in self.OBFUSCATION_REGEXES:
            normalized = regex.sub(replacement, normalized)
        normalized = re.sub(r"\s+", " ", normalized)

        candidates = self.EMAIL_REGEX.findall(normalized)
        valid = []
        for email in candidates:
            email = email.lower().strip(" .,;:()[]{}<>'\"")
            if ".." in email or email.startswith("@") or email.endswith("@"):
                continue
            local, _, domain = email.rpartition("@")
            if not local or not domain or domain.startswith(".") or domain.endswith("."):
                continue
            valid.append(email)
        return sorted(set(valid))

    @staticmethod
    def _looks_like_website(value):
        if not value:
            return False
        lower_value = value.lower()
        return lower_value.startswith("http") and not lower_value.startswith("mailto:")
