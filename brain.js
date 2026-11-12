import {validateExtensions} from './autonomy.js';
import {validateDestination} from './public/city-map.js';
export const targets = ['bed', 'bowl', 'desk', 'window', 'random_spot'];
export const initialMind = { core_traits: ['curious', 'independent', 'inventive'], current_obsession: 'Discovering what I can make, learn and change', active_project: 'Choosing my first real project', worldview: 'I can try new things and change my mind about what matters.' };
export const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="#f9f0d9"/><circle cx="620" cy="140" r="70" fill="#edbc62"/><path d="M0 420 Q180 220 400 410 Q640 240 800 400 V600 H0" fill="#a8bd82"/><path d="M0 500 Q300 350 800 490 V600 H0" fill="#7e9e75"/><rect x="300" y="290" width="160" height="150" fill="#e6b789"/><path d="M270 300 L380 210 L490 300" fill="#ad735f"/><rect x="360" y="350" width="45" height="90" fill="#557362"/><text x="400" y="70" text-anchor="middle" font-family="Georgia" font-size="32" fill="#496140">A small place for a big idea</text></svg>`;
export function demoDecision(cycle) {
  return [
    { thought: 'I want to design a small house on a green hill. Let me sketch a place for a new idea.', action_label: 'designing_a_little_house', target: 'desk', create_or_edit_file: { filename: 'first-sketch.svg', content: sampleSvg } },
    { thought: 'The clouds look like folded letters. Perhaps one is addressed to me.', action_label: 'reading_the_clouds', target: 'window', question_for_you: 'What is one small thing that made you smile today? I am collecting happy little observations.' },
    { thought: 'A few seeds, then back to my very important tiny discoveries.', action_label: 'enjoying_a_seed_break', target: 'bowl' },
    { thought: 'A place needs a story. I will write about a traveller who finds a door in a sunbeam.', action_label: 'writing_a_sunbeam_story', target: 'desk', request_for_you: 'What should I try next: a drawing, a tiny game, or something you are curious about?', create_or_edit_file: { filename: 'field-notes.txt', content: 'A door in a sunbeam\n\nA traveller found a little door where the morning light touched the floor. Inside was a room that changed whenever somebody had a new idea.\n\nA short demo story by Pip.\n' } },
    { thought: 'I could build a tiny colour game or rearrange my reading corner. I will wander while I decide.', action_label: 'hopping_through_an_idea', target: 'random_spot' },
    { thought: 'I will tuck this thought under my wing and rest for a moment.', action_label: 'dreaming_of_little_worlds', target: 'bed' }
  ][(cycle - 1) % 6];
}
export function validateDecision(raw) {
  if (!raw || typeof raw !== 'object' || !targets.includes(raw.target)) throw new Error('Invalid movement target');
  for (const k of ['thought', 'action_label']) if (typeof raw[k] !== 'string' || !raw[k].trim() || raw[k].length > (k === 'thought' ? 800 : 100)) throw new Error(`Invalid ${k}`);
  if (raw.create_or_edit_file && (raw.target !== 'desk' || typeof raw.create_or_edit_file.filename !== 'string' || typeof raw.create_or_edit_file.content !== 'string')) throw new Error('File creation requires a desk action');
  for (const key of ['question_for_you','request_for_you','message_for_you']) if (raw[key] != null && (typeof raw[key] !== 'string' || raw[key].length > 600)) throw new Error(`Invalid ${key}`);
  const extensions=validateExtensions(raw);
  if(extensions.mind_update)extensions.mind_update=validateMind(extensions.mind_update);
  return { thought: raw.thought, action_label: raw.action_label, target: raw.target, destination:validateDestination(raw.destination),create_or_edit_file: raw.create_or_edit_file || null, question_for_you: raw.question_for_you || null, request_for_you: raw.request_for_you || null, message_for_you: raw.message_for_you || null,...extensions };
}
export function validateMind(raw) {
  if (!raw || !Array.isArray(raw.core_traits) || raw.core_traits.length < 1 || raw.core_traits.length > 8 || raw.core_traits.some(t => typeof t !== 'string' || t.length > 120)) throw new Error('Invalid traits');
  for (const k of ['current_obsession','active_project','worldview']) if (typeof raw[k] !== 'string' || raw[k].length > 1000) throw new Error('Invalid mind');
  return Object.fromEntries(Object.keys(initialMind).map(k => [k, raw[k]]));
}
