-- Admins can remove a community (with its posts and memberships), recorded in the audit log. Additive.

begin;

alter table public.admin_actions drop constraint if exists admin_actions_action_check;
alter table public.admin_actions add constraint admin_actions_action_check
  check (action in ('suspend', 'reinstate', 'remove_post', 'remove_reply', 'grant_badge', 'revoke_badge', 'remove_community'));

create function public.admin_remove_community(admin uuid, community uuid, why text) returns void language plpgsql as $$
declare
  c public.communities;
  members int;
  posts int;
begin
  perform public.require_permission(admin, 'content.remove_any');
  select count(*) into members from public.community_members where community_id = community;
  select count(*) into posts from public.posts where community_id = community;
  delete from public.communities where id = community returning * into c;
  if c.id is null then
    raise exception 'Community not found' using errcode = 'no_data_found';
  end if;
  insert into public.admin_actions (admin_id, action, target_profile_id, target_id, reason, details)
  values (admin, 'remove_community', c.owner_id, c.id, why,
    jsonb_build_object('slug', c.slug, 'name', c.name, 'description', c.description, 'members', members, 'posts', posts, 'created_at', c.created_at));
end;
$$;

commit;
