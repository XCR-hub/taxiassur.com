/*
  # Add DOWN_PAYMENT_REQUIRED status to lead_status enum

  1. Changes
    - Add 'DOWN_PAYMENT_REQUIRED' value to lead_status enum
    - This status represents leads where a down payment (Comptant CIC) is required before policy activation

  2. Purpose
    - Supports TaxiAssur business process where some insurance policies require upfront payment
    - Allows better tracking of the payment collection phase
    - Integrates with CIC payment system for down payments
*/

ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'DOWN_PAYMENT_REQUIRED';
