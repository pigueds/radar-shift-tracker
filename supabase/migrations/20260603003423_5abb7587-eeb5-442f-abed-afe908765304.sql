
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'operador', 'gerente');
CREATE TYPE public.task_area AS ENUM ('termica', 'eletrica', 'eta');
CREATE TYPE public.task_priority AS ENUM ('critica', 'alta', 'media', 'baixa');
CREATE TYPE public.task_impact AS ENUM ('seguranca', 'meio_ambiente', 'confiabilidade', 'producao', 'eficiencia_energetica', 'rotina_operacional');
CREATE TYPE public.task_status AS ENUM ('pendente', 'em_andamento', 'concluida', 'nao_concluida', 'vencida');
CREATE TYPE public.task_turno AS ENUM ('manha', 'tarde', 'noite', 'integral');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  area_padrao public.task_area,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_select_auth" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_date DATE NOT NULL,
  area public.task_area NOT NULL,
  description TEXT NOT NULL,
  responsavel TEXT NOT NULL DEFAULT '',
  turno public.task_turno NOT NULL DEFAULT 'integral',
  prioridade public.task_priority NOT NULL DEFAULT 'media',
  impacto public.task_impact NOT NULL DEFAULT 'rotina_operacional',
  status public.task_status NOT NULL DEFAULT 'pendente',
  observacao TEXT NOT NULL DEFAULT '',
  inherited_from UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  original_date DATE,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_date ON public.tasks(task_date);
CREATE INDEX idx_tasks_area_date ON public.tasks(area, task_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select_auth" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "tasks_insert_admin" ON public.tasks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tasks_update_admin_or_operador" ON public.tasks FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));
CREATE POLICY "tasks_delete_admin" ON public.tasks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Audit
CREATE TABLE public.task_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_audit_task ON public.task_audit(task_id);
GRANT SELECT, INSERT ON public.task_audit TO authenticated;
GRANT ALL ON public.task_audit TO service_role;
ALTER TABLE public.task_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_select_auth" ON public.task_audit FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_insert_auth" ON public.task_audit FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Audit trigger on tasks
CREATE OR REPLACE FUNCTION public.tasks_audit_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_audit (task_id, user_id, action, details)
    VALUES (NEW.id, NEW.created_by, 'create', jsonb_build_object('status', NEW.status, 'description', NEW.description));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status OR NEW.observacao IS DISTINCT FROM OLD.observacao OR NEW.description IS DISTINCT FROM OLD.description THEN
      INSERT INTO public.task_audit (task_id, user_id, action, details)
      VALUES (NEW.id, NEW.updated_by, 'update',
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'observacao', NEW.observacao));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_tasks_audit AFTER INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.tasks_audit_trigger();

-- handle_new_user: create profile + assign role (first user = admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INTEGER;
  v_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));

  SELECT COUNT(*) INTO v_count FROM public.user_roles;
  IF v_count = 0 THEN
    v_role := 'admin';
  ELSE
    v_role := 'operador';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
