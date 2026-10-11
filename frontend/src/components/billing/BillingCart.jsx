import Cart from "./Cart";

export default function BillingCart({
  items,
  totals,
  onUpdateQuantity,
  onRemoveItem,
  onApplyDiscount,
  onCheckout,
  isEmpty,
}) {
  return (
    <div className="h-full">
      <Cart
        items={items}
        totals={totals}
        onUpdateQuantity={onUpdateQuantity}
        onRemoveItem={onRemoveItem}
        onApplyDiscount={onApplyDiscount}
        onCheckout={onCheckout}
        isEmpty={isEmpty}
      />
    </div>
  );
}