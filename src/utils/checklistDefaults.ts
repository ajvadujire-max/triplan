/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChecklistItem } from "../types";

export const getRichDefaultChecklist = (tripId: string): ChecklistItem[] => {
  const items: { title: string; category: string }[] = [
    // Documents
    { title: "Passport / Government ID", category: "Documents" },
    { title: "Tickets", category: "Documents" },
    { title: "Hotel Booking", category: "Documents" },
    { title: "Driving License", category: "Documents" },
    { title: "Insurance Papers", category: "Documents" },
    { title: "Wallet", category: "Documents" },

    // Electronics
    { title: "Mobile Phone", category: "Electronics" },
    { title: "Charger", category: "Electronics" },
    { title: "Power Bank", category: "Electronics" },
    { title: "Earphones", category: "Electronics" },
    { title: "Laptop", category: "Electronics" },
    { title: "Laptop Charger", category: "Electronics" },
    { title: "Camera", category: "Electronics" },
    { title: "Camera Battery", category: "Electronics" },

    // Clothing
    { title: "T-Shirts", category: "Clothing" },
    { title: "Shirts", category: "Clothing" },
    { title: "Pants", category: "Clothing" },
    { title: "Shorts", category: "Clothing" },
    { title: "Undergarments", category: "Clothing" },
    { title: "Socks", category: "Clothing" },
    { title: "Jacket", category: "Clothing" },
    { title: "Sleepwear", category: "Clothing" },
    { title: "Slippers", category: "Clothing" },
    { title: "Shoes", category: "Clothing" },

    // Toiletries
    { title: "Toothbrush", category: "Toiletries" },
    { title: "Toothpaste", category: "Toiletries" },
    { title: "Soap", category: "Toiletries" },
    { title: "Shampoo", category: "Toiletries" },
    { title: "Face Wash", category: "Toiletries" },
    { title: "Towel", category: "Toiletries" },
    { title: "Comb", category: "Toiletries" },
    { title: "Deodorant", category: "Toiletries" },

    // Health
    { title: "Medicines", category: "Health" },
    { title: "First Aid Kit", category: "Health" },
    { title: "Prescription Medicines", category: "Health" },
    { title: "Bandages", category: "Health" },
    { title: "Hand Sanitizer", category: "Health" },
    { title: "Face Masks", category: "Health" },

    // Travel Essentials
    { title: "Water Bottle", category: "Travel Essentials" },
    { title: "Snacks", category: "Travel Essentials" },
    { title: "Sunglasses", category: "Travel Essentials" },
    { title: "Umbrella", category: "Travel Essentials" },
    { title: "Travel Pillow", category: "Travel Essentials" },
    { title: "Backpack", category: "Travel Essentials" },
    { title: "Pen", category: "Travel Essentials" },
    { title: "Notebook", category: "Travel Essentials" },
    { title: "Keys", category: "Travel Essentials" },
  ];

  return items.map((item, idx) => ({
    id: `chk_def_${idx}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    tripId,
    title: item.title,
    category: item.category,
    isPacked: false,
  }));
};
