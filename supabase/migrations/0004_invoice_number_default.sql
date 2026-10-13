-- invoices_assign_number always replaces this value; the default only lets
-- inserts omit the column.
alter table public.invoices alter column number set default 0;
