select cron.unschedule('microstudy-push-check') where exists (select 1 from cron.job where jobname = 'microstudy-push-check');

select cron.schedule(
  'microstudy-push-check',
  '0 16 * * *',
  $$
  select extensions.http_post(
    url := 'https://project--5b0b2e64-484a-4a5d-80c2-9f386ebe6339.lovable.app/api/public/push-check',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer 24ab2908a9751946273b2570621656e0a2c521f9faa7ab4a"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);