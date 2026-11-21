import { defineHandler } from 'nitro';
import { HTTPError, getRouterParam } from 'nitro/h3';
import { uuidParam } from '../../../utils/admin';
import { requireViewer } from '../../../utils/auth';
import { sql } from '../../../utils/db';
import { messageFeatures } from '../../../utils/messages';

// Deletes a message for everyone. Only the sender can. The message stays in the conversation as
// "This message was deleted", and its text, picture or recording is wiped (a picture or recording is
// replaced by a single empty byte, since the database does not allow none).
export default defineHandler(async (event) => {
  const { profile } = await requireViewer(event);
  const id = uuidParam(getRouterParam(event, 'id'));
  const features = await messageFeatures();
  if (!features.deletes) throw new HTTPError('Deleting messages isn’t available yet. Please try again soon.', { status: 503 });
  const [gone] = await sql`
    update public.direct_messages set deleted_at = now()
    where id = ${id} and sender_id = ${profile.id} and deleted_at is null
    returning image_id, voice_id`;
  if (!gone) throw new HTTPError('Message not found', { status: 404 });
  if (gone.image_id) await sql`update public.message_images set bytes = '\\x00'::bytea where id = ${gone.image_id}`;
  if (gone.voice_id) await sql`update public.voice_notes set bytes = '\\x00'::bytea where id = ${gone.voice_id}`;
  if (features.reactions) await sql`delete from public.message_reactions where message_id = ${id}`;
  return { ok: true };
});
