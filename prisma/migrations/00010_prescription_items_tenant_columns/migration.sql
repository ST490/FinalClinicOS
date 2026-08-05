-- Add tenant isolation columns to prescription_items.
-- Backfills org_id and clinic_id from the parent prescriptions row.

ALTER TABLE prescription_items
  ADD COLUMN IF NOT EXISTS org_id text,
  ADD COLUMN IF NOT EXISTS clinic_id text;

-- Clean up orphaned prescription items that do not have a parent prescription
DELETE FROM prescription_items
WHERE prescription_id NOT IN (SELECT id FROM prescriptions);

UPDATE prescription_items pi
SET org_id = p.org_id, clinic_id = p.clinic_id
FROM prescriptions p
WHERE pi.prescription_id = p.id
  AND (pi.org_id IS NULL OR pi.clinic_id IS NULL);

ALTER TABLE prescription_items
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN clinic_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS prescription_items_org_clinic_idx
  ON prescription_items (org_id, clinic_id);
