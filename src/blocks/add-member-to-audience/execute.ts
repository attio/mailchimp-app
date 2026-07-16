import {isErrored} from "@attio/fetchable"
import {Workflows} from "attio/server"
import {getMailchimp} from "../../mailchimp/get-mailchimp"
import {mailchimpApiErrorUserMessage} from "../../mailchimp/types/errors"
import block from "./block"

export default Workflows.defineWorkflowBlockExecute(block, async ({config}) => {
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
        id: "success",
        data: null,
    }
})
