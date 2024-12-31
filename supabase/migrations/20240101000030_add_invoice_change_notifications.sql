-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS notify_invoice_created ON public.invoices;
DROP TRIGGER IF EXISTS notify_invoice_updated ON public.invoices;
DROP FUNCTION IF EXISTS public.handle_invoice_changes(); 