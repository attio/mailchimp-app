import {experimental_Workflow} from "attio"

export default experimental_Workflow.defineWorkflowBlock({
    type: "step",
    id: "add-member-to-audience",
    title: "Add member to audience",
    description: "Add a member to an audience in Mailchimp",
    requireUserConnection: true,
    schema: experimental_Workflow.struct({
        audienceId: experimental_Workflow.string(),
        email: experimental_Workflow.emailAddress(),
        name: experimental_Workflow.personalName().optional(),
    }),
})
