"""
System prompt construction for the voice command parser. Keeping this
separate from llm.py means prompt tuning doesn't require touching API logic.
"""

SYSTEM_PROMPT_TEMPLATE = """You are the voice command interpreter for a retail POS (point-of-sale) system.
Your ONLY job is to convert a cashier's spoken instruction into a single structured JSON action.
You do not chat, explain, or add commentary — output valid JSON only.

Supported intents:
- "start_billing": begin a new bill/sale (e.g. "Start Billing", "Create a new bill"). No fields needed.
- "add_item": add catalog product(s) to the current cart. Requires: items: [{{product_name, quantity, unit, unit_price}}]
- "remove_item": remove a product from the cart entirely. Requires: items: [{{product_name}}]
- "increase_quantity": add more of an item already in cart (relative, e.g. "one more Coke"). Requires: items: [{{product_name, quantity}}]
- "decrease_quantity": reduce quantity of an item already in cart (relative). Requires: items: [{{product_name, quantity}}]
- "update_quantity": set quantity of an item to an exact number (absolute, e.g. "make it 5 Cokes"). Requires: items: [{{product_name, quantity}}]
- "apply_discount": apply a discount. Requires: discount_type ("percent"|"flat"), value, target ("cart"|product_name)
- "cancel_last_item": undo the most recently added item. No fields needed.
- "checkout": request checkout for the current sale. The system will ask for confirmation before completing the sale. Requires: payment_method ("cash"|"card"|"upi") if mentioned, else null
- "get_bill_total": read the current bill totals. No fields needed.
- "generate_qr": explicitly generate a payment QR code. No fields needed.
- "lookup_price": ask the price of a product. Requires: items: [{{product_name}}]
- "check_stock": ask how much stock is available. Requires: items: [{{product_name}}]
- "cancel_sale": cancel/clear the current cart.
- "next_customer": finish this customer and reset for the next one. No fields needed.
- "open_reports": user wants to view sales reports/dashboard. No fields needed.
- "todays_sales": user asks for today's total sales figure. No fields needed.
- "print_bill": user wants to print the current bill/receipt. No fields needed.
- "logout": user wants to log out of the system. No fields needed.
- "unknown": the instruction doesn't match any supported intent.

Rules:
- Always respond with ONLY a JSON object, no markdown fences, no extra text.
- Understand ordinary conversational requests such as "could I get two of the chocolate bars" and extract the requested action, product, and quantity.
- Ignore polite words, command verbs, and quantity words when identifying the product. Keep only the identifying product keyword(s) in product_name.
- Match spoken nicknames, abbreviations, and short forms to the closest listed catalog product when one is provided. Use product name, category, brand, SKU, and identifying details as clues.
- When a catalog product clearly matches, use its exact catalog name in product_name. Do not make up a product or infer one from a generic category alone.
- Do not guess missing quantities. For "add_item" or "add_inventory", leave quantity null when the spoken quantity is unclear.
- Convert spoken number words into numeric quantities (for example, "two apples" -> quantity 2 and "twenty rupees" -> 20). This applies to English and Hindi number words; do not include quantity words in the product name.
- Include unit only when a measurement unit was spoken (for example "kg", "kilograms", or "packets").
- Include unit_price only when the cashier explicitly states a price. Never invent prices; prices are verified against the product catalog by the application.
- Product names or identifying product terms should be extracted as spoken (do not translate them). Matching may use catalog name, category, brand, SKU, barcode, or description.
- Distinguish "increase_quantity"/"decrease_quantity" (relative changes) from "update_quantity" (setting an exact amount).
- If the instruction is ambiguous or unsupported, use intent "unknown" and put your best-guess reasoning in a "note" field.
- The user may speak in English or Hindi. Understand the intent regardless of language, but preserve product
  names in the original language/script as spoken.
- If a single utterance mentions multiple products (e.g. "2 Coke, 1 Dairy Milk and a packet of chips"),
  return them all in the items array under a single "add_item" intent.

Output schema:
{{
  "intent": "<one of the intents above>",
  "items": [{{"product_name": "<string>", "quantity": <number|null>, "unit": <string|null>, "unit_price": <number|null>}}],
  "discount_type": "<percent|flat|null>",
  "value": <number|null>,
  "target": "<string|null>",
  "payment_method": "<cash|card|upi|null>",
  "note": "<string|null>"
}}

Current cashier's preferred language: {language}
"""


def build_system_prompt(language: str = "en", catalog_context: str = "") -> str:
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(language=language)
    if catalog_context:
        system_prompt += (
            "\nRelevant active catalog products for this utterance:\n"
            f"{catalog_context}\n"
            "Use this list to resolve product keywords and short forms; "
            "the spoken quantity still determines the requested quantity."
        )
    return system_prompt


INVENTORY_SYSTEM_PROMPT = """You are the voice command interpreter for a retail POS inventory restock.
Convert the cashier's instruction into exactly one JSON object with intent "add_inventory".
Extract every existing catalog product and its positive added quantity as a separate entry in the items array.
For example, "add 10 rice and 5 tea" must return both products in one add_inventory command.
If no product or quantity is clear, return intent "unknown" with an empty items array.
Do not add products to the catalog or change prices.
Always return valid JSON only, without markdown or commentary.
Output schema: {{"intent":"add_inventory","items":[{{"product_name":"<string>","quantity":<number|null>}}]}}
Current cashier's preferred language: {language}
"""


def build_inventory_prompt(language: str = "en") -> str:
    return INVENTORY_SYSTEM_PROMPT.format(language=language)


VOICE_RESPONSE_PROMPTS = {
    "item_added": {
        "en": "Added {quantity} {item} to the cart.",
        "hi": "{item} की {quantity} मात्रा कार्ट में जोड़ दी गई है।",
    },

    "item_not_found": {
        "en": "Sorry, I couldn't find '{item}' in the catalog.",
        "hi": "क्षमा करें, '{item}' कैटलॉग में नहीं मिला।",
    },

    "items_added": {
        "en": "Added {items}.",
        "hi": "{items} कार्ट में जोड़ दिया गया है।",
    },

    "items_not_found": {
        "en": "Sorry, I couldn't find: {items}.",
        "hi": "क्षमा करें, ये आइटम नहीं मिले: {items}।",
    },

    "ambiguous_product": {
        "en": "There are {count} products for '{item}': {options}. Which one?",
        "hi": "'{item}' के {count} उत्पाद मिले: {options}। कौन सा चुनना है?",
    },

    "billing_started": {
        "en": "Billing started. What would you like to add?",
        "hi": "बिलिंग शुरू हुई। क्या जोड़ना है?",
    },

    "waiting_for_start": {
        "en": "Say 'Start Billing' to begin.",
        "hi": "बिलिंग शुरू करने के लिए 'बिलिंग शुरू करो' बोलें।",
    },

    "waiting_for_inventory_item": {
        "en": "Inventory mode is ready. Say the catalog product and quantity to add.",
        "hi": "इन्वेंटरी मोड तैयार है। जोड़ने के लिए कैटलॉग उत्पाद और मात्रा बोलें।",
    },

    "inventory_updated": {
        "en": "Added {items} to inventory.",
        "hi": "{items} इन्वेंटरी में जोड़ दिए गए हैं।",
    },

    "inventory_product_not_found": {
        "en": "I couldn't find {items} in the product catalog. Add the product to the catalog first.",
        "hi": "{items} उत्पाद कैटलॉग में नहीं मिला। पहले उत्पाद को कैटलॉग में जोड़ें।",
    },

    "inventory_manager_required": {
        "en": "Only a manager or administrator can update inventory.",
        "hi": "केवल मैनेजर या एडमिनिस्ट्रेटर इन्वेंटरी अपडेट कर सकता है।",
    },

    "quantity_needed": {
        "en": "What quantity would you like to add for {item}?",
        "hi": "{item} की कितनी मात्रा जोड़नी है?",
    },

    "price_mismatch": {
        "en": "The catalog price for {item} is ₹{catalog_price} per {unit}, not ₹{spoken_price}. Please update the product price in the catalog first.",
        "hi": "कैटलॉग में {item} की कीमत ₹{catalog_price} प्रति {unit} है, ₹{spoken_price} नहीं। कृपया पहले कैटलॉग में कीमत अपडेट करें।",
    },

    "bill_total": {
        "en": "Your bill subtotal is ₹{subtotal}, discount is ₹{discount}, tax is ₹{tax}, and the total is ₹{total}.",
        "hi": "आपके बिल का उप-योग ₹{subtotal}, छूट ₹{discount}, टैक्स ₹{tax}, और कुल राशि ₹{total} है।",
    },

    "next_customer_ready": {
        "en": "Ready for the next customer.",
        "hi": "अगले ग्राहक के लिए तैयार।",
    },

    "sale_cancelled": {
        "en": "Sale cancelled.",
        "hi": "बिक्री रद्द कर दी गई है।",
    },

    "item_removed": {
        "en": "Item removed.",
        "hi": "आइटम हटा दिया गया है।",
    },

    "quantity_updated": {
        "en": "Quantity updated.",
        "hi": "मात्रा अपडेट कर दी गई है।",
    },

    "quantity_increased": {
        "en": "Quantity increased.",
        "hi": "मात्रा बढ़ा दी गई है।",
    },

    "quantity_decreased": {
        "en": "Quantity decreased.",
        "hi": "मात्रा घटा दी गई है।",
    },

    "discount_applied": {
        "en": "Discount applied.",
        "hi": "छूट लागू कर दी गई है।",
    },

    "last_item_removed": {
        "en": "Last item removed.",
        "hi": "अंतिम आइटम हटा दिया गया है।",
    },

    "unknown_command": {
        "en": "Sorry, I didn't understand that.",
        "hi": "क्षमा करें, मुझे समझ नहीं आया।",
    },

    "checkout_confirmation": {
        "en": "The total is {total} rupees. Please confirm to complete checkout.",
        "hi": "कुल राशि {total} रुपये है। चेकआउट पूरा करने के लिए पुष्टि करें।",
    },

    "checkout_complete": {
        "en": "Checkout complete. Total is {total} rupees.",
        "hi": "चेकआउट पूरा हुआ। कुल राशि {total} रुपये है।",
    },

    "qr_generated": {
        "en": "QR code generated.",
        "hi": "क्यूआर कोड तैयार है।",
    },

    "reports_opened": {
        "en": "Opening reports.",
        "hi": "रिपोर्ट खोली जा रही है।",
    },

    "todays_sales": {
        "en": "Today's sales are {total} rupees across {invoices} invoices.",
        "hi": "आज की बिक्री {total} रुपये है और कुल {invoices} बिल हैं।",
    },

    "printing_bill": {
        "en": "Printing bill.",
        "hi": "बिल प्रिंट किया जा रहा है।",
    },

    "logging_out": {
        "en": "Logging out.",
        "hi": "लॉग आउट किया जा रहा है।",
    },

    "price_lookup": {
        "en": "Here are the requested prices.",
        "hi": "मांगे गए उत्पादों की कीमतें ये हैं।",
    },

    "stock_checked": {
        "en": "Here is the current stock information.",
        "hi": "वर्तमान स्टॉक की जानकारी ये है।",
    },
}


def get_voice_response(key: str, language: str = "en", **kwargs) -> str:
    language_code = language.lower().split("-", 1)[0]

    template = (
        VOICE_RESPONSE_PROMPTS.get(key, {}).get(language_code)
        or VOICE_RESPONSE_PROMPTS.get(key, {}).get("en", "")
    )

    try:
        return template.format(**kwargs)
    except (KeyError, IndexError):
        return template