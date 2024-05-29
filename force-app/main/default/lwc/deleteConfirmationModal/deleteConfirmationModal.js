import { api, wire } from 'lwc';
import LightningModal from 'lightning/modal';
import { deleteRecord } from 'lightning/uiRecordApi';
import { CurrentPageReference } from 'lightning/navigation';
import { refreshApex } from "@salesforce/apex";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
export default class DeleteConfirmationModal extends LightningModal {
    @api recordId;
    @api content;
    @api accountId;
    @api confirmMessage;
    @api wiredAccountList;


    @wire(CurrentPageReference) currentPageReference;

    handleClick(event) {
        let finalEvent = {
            accountId : this.accountId,
            status: event.target.name
        };
        console.log(finalEvent.status);
        if (finalEvent.status == 'Delete') {
            this.handleDelete(finalEvent.accountId);
        }
        this.close('ended');
    }

    async handleDelete(event)  {
        const record = event;
        console.log(JSON.stringify(record));
        try {
            const result = await deleteRecord(record);
            this.dispatchEvent (
                new ShowToastEvent ({
                    title: 'Success',
                    message: 'Successfully deleted account',
                    variant: 'success'
                })
            );
            await refreshApex(this.wiredAccountList);
        }
        catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error deleting the account',
                    message: error.body.message,
                    variant: 'error',
                })
            );
        }
    }
}
