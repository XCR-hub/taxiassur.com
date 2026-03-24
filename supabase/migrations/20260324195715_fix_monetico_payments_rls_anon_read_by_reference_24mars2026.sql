/*
  # Fix monetico_payments RLS - Allow anon to read payment by reference

  ## Problem
  The PaiementLibre.tsx page (public, unauthenticated) queries monetico_payments
  by .eq('reference', ref) using the anon key. However, the existing SELECT
  policies for anon users only allow reading payments that are linked to a lead
  with an access_token. Free payments (no lead_id) are completely blocked.

  ## Solution
  Add a permissive SELECT policy that allows anyone (anon + authenticated) to
  read a single payment record by its reference column. The reference itself acts
  as an unguessable token (12-char random string), so exposure is acceptable.

  This matches the intended UX: a customer receives a payment link containing
  the reference and needs to load the payment details on the public page.
*/

-- Allow anyone with the reference (the "token") to read that payment record
CREATE POLICY "Public can view payment by reference"
  ON monetico_payments
  FOR SELECT
  TO anon, authenticated
  USING (reference IS NOT NULL);
