/**
 * Product list hook: fetches and caches product catalog for
 * Products.jsx and ProductTable.jsx, with search/filter support.
 */

import { useState, useEffect, useCallback } from "react";
import { listProducts } from "../services/products";

export function useProducts({ search = "", category = "", autoFetch = true } = {}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listProducts({ search, category });
      setProducts(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => {
    if (autoFetch) fetchProducts();
  }, [autoFetch, fetchProducts]);

  return { products, loading, error, refetch: fetchProducts };
}