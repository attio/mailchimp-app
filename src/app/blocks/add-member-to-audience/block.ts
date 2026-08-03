import {Workflows} from "attio"

export default Workflows.defineWorkflowBlock({
    type: "step",
    id: "add-member-to-audience",
    title: "Add member to audience",
    description: "Add a member to an audience in Mailchimp",
    requireUserConnection: true,
    configSchema: Workflows.ConfigSchema.struct({
        audienceId: Workflows.ConfigSchema.string(),
        email: Workflows.ConfigSchema.emailAddress(),
        name: Workflows.ConfigSchema.personalName().optional(),
    }),
})
