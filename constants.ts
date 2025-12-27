import { DesignStyle } from './types';

export const DESIGN_STYLES: DesignStyle[] = [
  {
    id: 'modern',
    name: 'Mid-Century Modern',
    prompt: 'Redesign this room in Mid-Century Modern style. Teak wood furniture, organic curves, clean lines, olive green and mustard accents.',
    thumbnail: 'https://picsum.photos/id/101/100/100',
  },
  {
    id: 'scandi',
    name: 'Scandinavian',
    prompt: 'Redesign this room in Scandinavian style. Minimalist, functional, bright white walls, light wood floors, cozy textures, clutter-free.',
    thumbnail: 'https://picsum.photos/id/201/100/100',
  },
  {
    id: 'industrial',
    name: 'Industrial',
    prompt: 'Redesign this room in Industrial style. Exposed brick, metal fixtures, raw wood, leather furniture, neutral tones, loft aesthetic.',
    thumbnail: 'https://picsum.photos/id/301/100/100',
  },
  {
    id: 'boho',
    name: 'Bohemian',
    prompt: 'Redesign this room in Bohemian style. Eclectic patterns, many plants, rattan furniture, layered rugs, warm earthy colors, relaxed vibe.',
    thumbnail: 'https://picsum.photos/id/401/100/100',
  },
  {
    id: 'japandi',
    name: 'Japandi',
    prompt: 'Redesign this room in Japandi style. Hybrid of Japanese rustic minimalism and Scandinavian functionality. Natural materials, muted colors, clean lines.',
    thumbnail: 'https://picsum.photos/id/501/100/100',
  }
];

export const INITIAL_CHAT_MESSAGE = "Hi! I'm your AI Design Consultant. I can help you find items in your new design, suggest layouts, or answer any interior design questions. How can I help?";
