
class DedupeEmailPipeline:
    def process_item(self, item, spider):
        emails = item.get("emails") or []
        item["emails"] = sorted(set(emails))
        return item
