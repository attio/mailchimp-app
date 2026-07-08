import {isErrored} from "@attio/fetchable"
import {experimental_Workflow, useAsyncCache} from "attio/client"
import listAudiences from "../../server-functions/list-audiences.server"
import {mailchimpApiErrorUserMessage} from "../../mailchimp/types/errors"
import block from "./block"

export default experimental_Workflow.defineConfigurator(block, (workflowBlock) => {
    const {ComboboxInput, EmailAddressInput, PersonalNameInput, Outcome} =
        experimental_Workflow.useConfigurator(workflowBlock.schema)

    const {values} = useAsyncCache({
        audiences: listAudiences,
    })

    const audiences = values.audiences

    return (
        <>
            <ComboboxInput
                name="audienceId"
                label="Audience"
                placeholder="Select an audience..."
                searchPlaceholder="Search audiences..."
                options={{
                    async getOption(value: string) {
                        if (isErrored(audiences)) {
                            return {
                                label: mailchimpApiErrorUserMessage(audiences.error),
                                value: "error",
                            }
                        }
                        const audience = audiences.value.find((a) => a.id === value)
                        return audience
                            ? {label: audience.name, value: audience.id}
                            : {label: "Unknown audience", value}
                    },
                    async search(query: string) {
                        if (isErrored(audiences)) {
                            return [
                                {
                                    label: mailchimpApiErrorUserMessage(audiences.error),
                                    value: "error",
                                },
                            ]
                        }
                        return audiences.value
                            .filter((a) => a.name.toLowerCase().includes(query.toLowerCase()))
                            .map((a) => ({label: a.name, value: a.id}))
                    },
                }}
                disableVariables
            />

            <EmailAddressInput
                name="email"
                label="Member email"
                placeholder="Enter email address..."
            />

            <PersonalNameInput name="name" label="Member name" placeholder="Enter full name..." />

            <Outcome slug="success" schema={null} />
        </>
    )
})
