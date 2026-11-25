-- Bayar dari dompet tabungan (permintaan Owner 25 Nov 2026).
-- Tabungan adalah dompet. Pengeluaran, pemasukan, dan transfer yang memakai dompet tabungan memakai dompet tabungan harus ikut
-- mengubah "Terkumpul" pada targetnya, supaya saldo dompet dan progres target selalu sama.
-- Kolom view tidak berubah. Rollback: pulihkan definisi lama (hanya suku goal_deposit/goal_withdraw).
create or replace view public.goal_progress with (security_invoker = true) as
select g.id, g.user_id, g.name, g.target_amount, g.initial_amount, g.deadline, g.storage_place,
       g.storage_wallet_id, g.planned_per_payday, g.priority, g.status, g.is_emergency_fund, g.notes,
       s.saved,
       greatest(g.target_amount - s.saved, 0::bigint) as remaining,
       case when g.target_amount > 0
            then round(least(s.saved::numeric / g.target_amount::numeric, 1::numeric) * 100::numeric, 1)
            else null::numeric end as percent
from public.savings_goals g
cross join lateral (
  select (g.initial_amount::numeric
          + coalesce((select sum(case when t.type = 'goal_deposit' then t.amount
                                      when t.type = 'goal_withdraw' then -t.amount
                                      else 0::bigint end)
                      from public.transactions t
                      where t.goal_id = g.id and t.user_id = g.user_id), 0::numeric)
          + coalesce((select sum(
                        (case when t.wallet_id = w.id then
                           case when t.type = 'income' then t.amount
                                when t.type in ('expense','transfer') then -t.amount
                                else 0 end
                         else 0 end)
                      + (case when t.to_wallet_id = w.id and t.type = 'transfer' then t.amount else 0 end))
                      from public.transactions t
                      join public.wallets w on (w.id = t.wallet_id or w.id = t.to_wallet_id)
                      where w.goal_id = g.id and t.user_id = g.user_id
                        and t.type in ('income','expense','transfer')), 0::numeric)
         )::bigint as saved
) s;
