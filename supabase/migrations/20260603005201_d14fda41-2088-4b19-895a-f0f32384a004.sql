
DROP POLICY IF EXISTS tasks_insert_admin ON public.tasks;
DROP POLICY IF EXISTS tasks_delete_admin ON public.tasks;

CREATE POLICY tasks_insert_admin_or_gerente ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'));

CREATE POLICY tasks_delete_admin_or_gerente ON public.tasks
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'));
