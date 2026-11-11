import jaJp from '@/data/minecraft/lang/ja_jp.json';
import { createTranslator } from '@/lib/minecraft/text/translate';

/** Japanese client translations for Minecraft 1.21.11. */
export const translate = createTranslator(jaJp as Record<string, string>);
