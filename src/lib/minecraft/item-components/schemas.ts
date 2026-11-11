import { TextComponent } from '@/lib/minecraft/item-components/text';
import {
  BooleanLike,
  DyeColor,
  Float,
  Int,
  NonNegativeInt,
  PositiveInt,
  ResourceLocation,
  TagId,
} from '@/lib/minecraft/primitives';
import * as v from 'valibot';

/**
 * Valibot schemas for the data components we understand.
 *
 * Anything not listed here is still preserved by `ItemComponentsSchema` and
 * shown as raw data. Nested structures use `objectWithRest` so that fields
 * added by future game versions do not fail validation.
 */

const EmptyCompound = v.objectWithRest({}, v.unknown());

const EnchantmentLevel = PositiveInt;
const Enchantments = v.record(ResourceLocation, EnchantmentLevel);

const StatusEffectInstance = v.objectWithRest(
  {
    id: ResourceLocation,
    duration: PositiveInt,
    amplifier: NonNegativeInt,
    ambient: v.optional(BooleanLike),
    show_particles: v.optional(BooleanLike),
    show_icon: v.optional(BooleanLike),
  },
  v.unknown(),
);

const EntityAttributeModifier = v.objectWithRest(
  {
    type: ResourceLocation,
    id: ResourceLocation,
    amount: v.number(),
    operation: v.picklist(['add_value', 'add_multiplied_base', 'add_multiplied_total']),
    slot: v.optional(
      v.picklist(['any', 'mainhand', 'offhand', 'hand', 'armor', 'feet', 'legs', 'chest', 'head', 'body']),
    ),
  },
  v.unknown(),
);

const FoodEffect = v.objectWithRest(
  {
    effect: StatusEffectInstance,
    probability: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  },
  v.unknown(),
);

const Food = v.objectWithRest(
  {
    nutrition: NonNegativeInt,
    saturation: Float,
    can_always_eat: v.optional(BooleanLike),
    is_always_edible: v.optional(BooleanLike),
    eat_seconds: v.optional(Float),
    effects: v.optional(v.array(FoodEffect)),
  },
  v.unknown(),
);

const ToolRule = v.objectWithRest(
  {
    blocks: v.optional(v.union([v.string(), v.array(v.string())])),
    speed: v.optional(Float),
    correct_for_drops: v.optional(BooleanLike),
  },
  v.unknown(),
);

const Tool = v.objectWithRest(
  {
    rules: v.array(ToolRule),
    default_mining_speed: v.optional(Float),
    damage_per_block: v.optional(NonNegativeInt),
    can_destroy_blocks_in_creative: v.optional(BooleanLike),
  },
  v.unknown(),
);

const PotionContents = v.objectWithRest(
  {
    potion: v.optional(ResourceLocation),
    custom_effects: v.optional(v.array(StatusEffectInstance)),
    custom_color: v.optional(NonNegativeInt),
  },
  v.unknown(),
);

const TooltipDisplay = v.objectWithRest(
  {
    hide_tooltip: v.optional(BooleanLike),
    hidden_components: v.optional(v.array(v.string())),
  },
  v.unknown(),
);

const Equippable = v.objectWithRest(
  {
    slot: v.picklist(['head', 'chest', 'legs', 'feet', 'body', 'mainhand', 'offhand', 'saddle']),
    asset_id: v.optional(ResourceLocation),
    camera_overlay: v.optional(ResourceLocation),
    equip_sound: v.optional(ResourceLocation),
    allowed_entities: v.optional(v.union([v.string(), v.array(v.string())])),
    dispensable: v.optional(BooleanLike),
    swappable: v.optional(BooleanLike),
    damage_on_hurt: v.optional(BooleanLike),
  },
  v.unknown(),
);

const ProfileProperty = v.objectWithRest(
  {
    name: v.string(),
    value: v.string(),
    signature: v.optional(v.string()),
  },
  v.unknown(),
);

const Profile = v.objectWithRest(
  {
    name: v.optional(v.string()),
    id: v.optional(v.string()),
    properties: v.optional(v.array(ProfileProperty)),
  },
  v.unknown(),
);

const BannerPattern = v.objectWithRest(
  {
    pattern: ResourceLocation,
    color: DyeColor,
  },
  v.unknown(),
);

export const componentSchemas = {
  'minecraft:damage': NonNegativeInt,
  'minecraft:max_damage': PositiveInt,
  'minecraft:unbreakable': EmptyCompound,
  'minecraft:enchantments': Enchantments,
  'minecraft:stored_enchantments': Enchantments,
  'minecraft:enchantable': v.objectWithRest({ value: PositiveInt }, v.unknown()),
  'minecraft:repair_cost': NonNegativeInt,
  'minecraft:rarity': v.picklist(['common', 'uncommon', 'rare', 'epic']),
  'minecraft:custom_name': TextComponent,
  'minecraft:item_name': TextComponent,
  'minecraft:lore': v.array(TextComponent),
  'minecraft:custom_data': v.record(v.string(), v.unknown()),
  'minecraft:dyed_color': v.union([NonNegativeInt, v.tuple([v.number(), v.number(), v.number()])]),
  'minecraft:base_color': DyeColor,
  'minecraft:max_stack_size': v.pipe(Int, v.minValue(1), v.maxValue(99)),
  'minecraft:enchantment_glint_override': BooleanLike,
  'minecraft:glider': EmptyCompound,
  'minecraft:hide_additional_tooltip': EmptyCompound,
  'minecraft:damage_resistant': v.objectWithRest({ types: TagId }, v.unknown()),
  'minecraft:tooltip_display': TooltipDisplay,
  'minecraft:attribute_modifiers': v.array(EntityAttributeModifier),
  'minecraft:food': Food,
  'minecraft:tool': Tool,
  'minecraft:potion_contents': PotionContents,
  'minecraft:ominous_bottle_amplifier': NonNegativeInt,
  'minecraft:map_id': Int,
  'minecraft:weapon': v.objectWithRest(
    {
      item_damage_per_attack: v.optional(NonNegativeInt),
      disable_blocking_for_seconds: v.optional(Float),
    },
    v.unknown(),
  ),
  'minecraft:equippable': Equippable,
  'minecraft:tooltip_style': ResourceLocation,
  'minecraft:profile': Profile,
  'minecraft:banner_patterns': v.array(BannerPattern),
  'minecraft:block_entity_data': v.unknown(),
  'minecraft:entity_data': v.unknown(),
  'minecraft:container': v.unknown(),
  'minecraft:bundle_contents': v.unknown(),
  'minecraft:charged_projectiles': v.unknown(),
  'minecraft:use_remainder': v.unknown(),
} as const;

export type ComponentId = keyof typeof componentSchemas;

export const componentIds = Object.keys(componentSchemas) as ComponentId[];

export const schemaById = componentSchemas as Record<string, v.GenericSchema | undefined>;

/**
 * A component map with known components validated and unknown components
 * preserved untouched.
 */
export const ItemComponentsSchema = v.partial(v.objectWithRest(componentSchemas, v.unknown()));
