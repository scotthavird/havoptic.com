import { TOOL_CONFIG, type ToolId, type ToolCategory } from '../types/release';

/**
 * Get all tool IDs from TOOL_CONFIG
 */
export function getAllToolIds(): ToolId[] {
  return Object.keys(TOOL_CONFIG) as ToolId[];
}

/**
 * Get tools filtered by category
 */
export function getToolsByCategory(category: ToolCategory): ToolId[] {
  return getAllToolIds().filter((id) => TOOL_CONFIG[id].category === category);
}

/**
 * Get similar tools based on category (excludes the given tool)
 */
export function getSimilarTools(toolId: ToolId, limit = 3): ToolId[] {
  const category = TOOL_CONFIG[toolId].category;
  return getToolsByCategory(category)
    .filter((id) => id !== toolId)
    .slice(0, limit);
}

/**
 * Get tools grouped by category
 */
export function getToolsByCategories(): Record<ToolCategory, ToolId[]> {
  const categories: ToolCategory[] = ['cli', 'ide', 'hybrid'];
  const result = {} as Record<ToolCategory, ToolId[]>;

  for (const category of categories) {
    result[category] = getToolsByCategory(category);
  }

  return result;
}

/**
 * Category display names for UI
 */
export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  cli: 'CLI Tools',
  ide: 'IDE / Editor',
  hybrid: 'Hybrid',
};
