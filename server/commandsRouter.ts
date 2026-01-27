/**
 * Commands Router - tRPC endpoints for system commands
 * 
 * Provides endpoints for listing available commands based on active module.
 * Used by frontend SlashCommandMenu to filter commands by module.
 * 
 * @see docs/architecture/system_commands_architecture.md
 */

import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getAvailableCommands } from "./commands";

export const commandsRouter = router({
    /**
     * List commands available for a given module
     * 
     * Returns commands where modules includes '*' (all) or the specified moduleSlug.
     * Used by SlashCommandMenu to show only relevant commands.
     */
    listAvailable: protectedProcedure
        .input(z.object({
            moduleSlug: z.string().default('default')
        }))
        .query(({ input }) => {
            const commands = getAvailableCommands(input.moduleSlug);

            return commands.map(cmd => ({
                trigger: `/${cmd.slug}`,
                name: cmd.name,
                description: cmd.description,
                requiresArgument: cmd.requiresArgument || false,
                requiresProcess: cmd.requiresProcess,
                type: cmd.type,
                // Include modules for debugging/display purposes
                modules: cmd.modules,
            }));
        }),
});
