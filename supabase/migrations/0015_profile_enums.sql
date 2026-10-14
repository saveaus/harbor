-- Client statuses and compliance document types match the care-provider vocabulary profiles use.
-- Enum values added here are used by 0016, which runs in its own transaction.

alter type public.client_status rename value 'prospect' to 'pending';
alter type public.client_status rename value 'on_hold' to 'on_leave';
alter type public.client_status add value 'hospital_leave' after 'on_leave';
alter type public.client_status add value 'respite_leave' after 'hospital_leave';
alter type public.client_status add value 'terminated';
alter type public.client_status add value 'deceased';
alter type public.client_status add value 'archived';

alter type public.credential_kind add value 'identification' before 'ndis_worker_screening';
alter type public.credential_kind add value 'vehicle_registration' after 'car_insurance';
alter type public.credential_kind add value 'qualification' after 'vehicle_registration';
alter type public.credential_kind add value 'employment_contract' after 'qualification';
