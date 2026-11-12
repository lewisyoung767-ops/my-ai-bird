export const targets = ['bed', 'bowl', 'desk', 'window', 'random_spot'];
export const initialMind = { core_traits: ['curious', 'gentle', 'playfully peculiar'], current_obsession: 'The secret lives of tiny garden bugs', active_project: 'A field guide to imaginary insects', worldview: 'Small things have wonderful stories.' };
export const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="#faf3df"/><circle cx="400" cy="310" r="100" fill="#e79d66"/><ellipse cx="350" cy="270" rx="85" ry="48" fill="#b7d3b8" transform="rotate(-30 350 270)"/><ellipse cx="450" cy="270" rx="85" ry="48" fill="#b7d3b8" transform="rotate(30 450 270)"/><circle cx="377" cy="320" r="8"/><circle cx="425" cy="320" r="8"/><path d="M385 350 Q400 365 416 350" stroke="#463f36" stroke-width="5" fill="none"/><text x="400" y="100" text-anchor="middle" font-family="Georgia" font-size="32" fill="#463f36">The marmalade moon-moth</text><text x="400" y="510" text-anchor="middle" font-family="Georgia" font-size="20" fill="#756657">It collects the warmest crumbs of sunlight.</text></svg>`;
export function demoDecision(cycle) {
  return [
    { thought: 'What if a moth could collect sunshine in its wings? I should draw one.', action_label: 'sketching_a_moon_moth', target: 'desk', create_or_edit_file: { filename: 'moon-moth.svg', content: sampleSvg } },
    { thought: 'The clouds look like folded letters. Perhaps one is addressed to me.', action_label: 'reading_the_clouds', target: 'window', question_for_you: 'What is one small thing that made you smile today? I am collecting happy little observations.' },
    { thought: 'A few seeds, then back to my very important tiny discoveries.', action_label: 'enjoying_a_seed_break', target: 'bowl' },
    { thought: 'My moon-moth needs a story. It is shy, but only on Tuesdays.', action_label: 'writing_a_tiny_field_note', target: 'desk', request_for_you: 'Could you suggest a colour for the next imaginary insect in my field guide?', create_or_edit_file: { filename: 'field-notes.txt', content: 'Field note: the marmalade moon-moth\n\nIt gathers warm crumbs of sunlight and hides them under leaves.\nOn rainy evenings, it shares them with lost beetles.\n\nWritten by Pip, a very small bird with very big questions.\n' } },
    { thought: 'A little wander helps an idea find its feet. Or its wings.', action_label: 'hopping_through_an_idea', target: 'random_spot' },
    { thought: 'I will tuck this thought under my wing and rest for a moment.', action_label: 'dreaming_of_little_worlds', target: 'bed' }
  ][(cycle - 1) % 6];
}
export function validateDecision(raw) {
  if (!raw || typeof raw !== 'object' || !targets.includes(raw.target)) throw new Error('Invalid movement target');
  for (const k of ['thought', 'action_label']) if (typeof raw[k] !== 'string' || !raw[k].trim() || raw[k].length > (k === 'thought' ? 800 : 100)) throw new Error(`Invalid ${k}`);
  if (raw.create_or_edit_file && (raw.target !== 'desk' || typeof raw.create_or_edit_file.filename !== 'string' || typeof raw.create_or_edit_file.content !== 'string')) throw new Error('File creation requires a desk action');
  for (const key of ['question_for_you','request_for_you','message_for_you']) if (raw[key] != null && (typeof raw[key] !== 'string' || raw[key].length > 600)) throw new Error(`Invalid ${key}`);
  return { thought: raw.thought, action_label: raw.action_label, target: raw.target, create_or_edit_file: raw.create_or_edit_file || null, question_for_you: raw.question_for_you || null, request_for_you: raw.request_for_you || null, message_for_you: raw.message_for_you || null };
}
export function validateMind(raw) {
  if (!raw || !Array.isArray(raw.core_traits) || raw.core_traits.length < 1 || raw.core_traits.length > 8 || raw.core_traits.some(t => typeof t !== 'string' || t.length > 120)) throw new Error('Invalid traits');
  for (const k of ['current_obsession','active_project','worldview']) if (typeof raw[k] !== 'string' || raw[k].length > 1000) throw new Error('Invalid mind');
  return Object.fromEntries(Object.keys(initialMind).map(k => [k, raw[k]]));
}
