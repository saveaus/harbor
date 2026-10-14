-- Client profile tasks are billable tasks (0017), so the separate client task table goes.

drop table public.client_tasks;
drop type public.task_status;
