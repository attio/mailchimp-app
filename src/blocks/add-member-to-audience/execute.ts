import {isErrored} from "@attio/fetchable"
import {experimental_Workflow} from "attio/server"
import {getMailchimp} from "../../mailchimp/get-mailchimp"
import {mailchimpApiErrorUserMessage} from "../../mailchimp/types/errors"
import block from "./block"

export default experimental_Workflow.defineWorkflowBlockExecute(block, async (config) => {
    const {audienceId, name, email} = config

    const result = await getMailchimp().addMemberToAudience({
        listId: audienceId,
        emailAddress: email.normalized,
        firstName: name?.first_name,
        lastName: name?.last_name,
    })

    if (isErrored(result)) {
        return {
            type: "error",
            errorMessage: mailchimpApiErrorUserMessage(result.error),
        }
    }

    return {
        type: "outcome",
        slug: "success",
        data: null,
    }
})
