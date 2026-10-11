import { X } from "lucide-react";

export default function ProductForm({
  show,
  selected,
  form,
  setForm,
  onSubmit,
  onClose,
  onDeactivate,
}) {
  if (!show) return null;

  return (
    <div className="product-form-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="product-form-dialog w-full max-w-2xl rounded-2xl p-6 shadow-xl">

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {selected ? "Edit Product" : "Add Product"}
          </h2>

          <button onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          <input
            className="border rounded-xl p-3"
            placeholder="Product Name"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />

          <input
            className="border rounded-xl p-3"
            placeholder="SKU"
            value={form.sku}
            onChange={(e) =>
              setForm({ ...form, sku: e.target.value })
            }
          />

          <input
            className="border rounded-xl p-3"
            placeholder="Barcode"
            value={form.barcode}
            onChange={(e) =>
              setForm({ ...form, barcode: e.target.value })
            }
          />

          <input
            className="border rounded-xl p-3"
            placeholder="Category"
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value })
            }
          />

          <input
            type="number"
            className="border rounded-xl p-3"
            placeholder="Selling Amount"
            value={form.price}
            onChange={(e) =>
              setForm({
                ...form,
                price: Number(e.target.value),
              })
            }
          />

          <input
            type="number"
            className="border rounded-xl p-3"
            placeholder="Purchase Amount"
            value={form.cost_price}
            onChange={(e) =>
              setForm({
                ...form,
                cost_price: Number(e.target.value),
              })
            }
          />

          <input
            type="number"
            className="border rounded-xl p-3"
            placeholder="Initial Stock"
            value={form.initial_stock}
            onChange={(e) =>
              setForm({
                ...form,
                initial_stock: Number(e.target.value),
              })
            }
          />

          <input
            type="number"
            className="border rounded-xl p-3"
            placeholder="Reorder Level"
            value={form.reorder_level}
            onChange={(e) =>
              setForm({
                ...form,
                reorder_level: Number(e.target.value),
              })
            }
          />

          <div className="flex flex-col-reverse justify-end gap-3 pt-4 sm:col-span-2 sm:flex-row">

            {selected && (
              <button
                type="button"
                onClick={onDeactivate}
                className="px-5 py-3 rounded-xl bg-red-600 text-white"
              >
                Deactivate
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl border"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-[#0B1E4A] text-white"
            >
              Save
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}