"""
Bootstrap script: creates the first admin user directly in the DB,
bypassing the API's require_admin dependency (which otherwise creates a
chicken-and-egg problem — you need an admin to create an admin).

Run manually, once, after migrations:
    docker compose exec backend python -m backend.database.seed
"""

import sys
import getpass
import logging

from backend.database.database import db_session
from backend.models.user import User, UserRole
from backend.auth.encryption import hash_password

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")


def create_admin_interactive():
    """Prompts for admin credentials on the CLI — avoids hardcoding secrets in code/scripts."""
    print("=== Voice AI POS — Initial Admin Setup ===")
    name = input("Admin name: ").strip()
    email = input("Admin email: ").strip()
    phone = input("Admin phone (optional): ").strip() or None
    password = getpass.getpass("Admin password (min 8 chars): ")
    confirm = getpass.getpass("Confirm password: ")

    if password != confirm:
        print("Passwords do not match. Aborting.")
        sys.exit(1)
    if len(password) < 8:
        print("Password must be at least 8 characters. Aborting.")
        sys.exit(1)

    with db_session() as db:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"A user with email '{email}' already exists. Aborting.")
            sys.exit(1)

        admin = User(
            name=name,
            email=email,
            phone=phone,
            hashed_password=hash_password(password),
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin)

    logger.info(f"Admin user '{email}' created successfully.")
    print(f"\n✅ Admin '{email}' created. You can now log in via /api/v1/auth/login.")


def seed_demo_products():
    """
    Optional: seeds a handful of starter products so Products.jsx/Billing.jsx
    aren't empty on first login. Safe to skip in a real store — real inventory
    should be entered via the Products page instead.
    """
    from backend.models.product import Product
    from backend.services import inventory_service

    demo_products = [
        {"name": "Basmati Rice 1kg", "sku": "RICE-1KG", "price": 120.0, "cost_price": 95.0, "tax_percent": 5.0, "category": "Grocery"},
        {"name": "Sunflower Oil 1L", "sku": "OIL-1L", "price": 180.0, "cost_price": 150.0, "tax_percent": 5.0, "category": "Grocery"},
        {"name": "Toor Dal 1kg", "sku": "DAL-1KG", "price": 140.0, "cost_price": 115.0, "tax_percent": 5.0, "category": "Grocery"},
    ]

    with db_session() as db:
        for item in demo_products:
            existing = db.query(Product).filter(Product.sku == item["sku"]).first()
            if existing:
                continue
            product = Product(**item)
            db.add(product)
            db.flush()
            inventory_service.create_inventory_for_product(db, product.id, initial_quantity=50.0)

    logger.info("Demo products seeded (skip this step for a real live store).")


if __name__ == "__main__":
    create_admin_interactive()

    if "--with-demo-products" in sys.argv:
        seed_demo_products()