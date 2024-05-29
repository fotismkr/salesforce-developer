import { LightningElement, wire, api, track } from 'lwc';
import getAccounts from '@salesforce/apex/getAccounts.getAccounts';
import insertAccounts from '@salesforce/apex/getAccounts.insertAccounts';
import updateAccount from '@salesforce/apex/getAccounts.updateAccounts';
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { refreshApex } from "@salesforce/apex";
import ACCOUNT_ID from '@salesforce/schema/Account.Id';
import RATING from '@salesforce/schema/Account.Rating';
import ACCOUNT_NAME from '@salesforce/schema/Account.Name';
import PHONE from '@salesforce/schema/Account.Phone';
import ACTIVE from '@salesforce/schema/Account.Active__c';
import USERNAME from '@salesforce/schema/User.Name';
import Id from '@salesforce/user/Id';
import { getRecord } from 'lightning/uiRecordApi';
import { CurrentPageReference } from 'lightning/navigation';
import ConfirmationModal from 'c/deleteConfirmationModal';


const actions = [
    { label: 'Delete', name: 'delete' }
];

const COLS = [
    { label: 'Id', fieldName: ACCOUNT_ID.fieldApiName},
    { label: 'Name', fieldName: ACCOUNT_NAME.fieldApiName, editable: true},
    { label: 'Rating', fieldName: RATING.fieldApiName, editable: true},
    { label: 'Phone', fieldName: PHONE.fieldApiName, editable: true},
    { label: 'Active', fieldName: ACTIVE.fieldApiName, editable: true},
    { type: 'action', typeAttributes: { rowActions: actions, menuAlignment: 'right' } }
]

export default class AccountsTable extends LightningElement {
    @api recordId;
    confirmMessage;
    greeting = 'World';
    columns = COLS;
    currentRecord;
    accountList;
    wiredAccountList;
    currentUserName;
    showInputField = false;
    newAccountName = '';
    newPhone = '';
    draftValues = [];

    @wire(CurrentPageReference) currentPageReference;
    
    @wire(getRecord, {recordId: Id, fields: [USERNAME]})
    currentUserInfo({data, error}) {
        if (data) {
            this.currentUserName = data.fields.Name.value;
        }
        else if (error) {
            console.log(error);
        }
    }
    
    @wire(getAccounts, { currentAccountId: '$recordId'})
    wiredAccounts(result)
     {  
        this.wiredAccountList = result;
        if (result.data) {
            this.accountList = result.data;
            console.log(result.data);
        }
        else if (result.error) {
            console.log(result.error)
        }
    }
    
    async handleDeleteModal(event) {
        const record = event.detail.row;
        console.log(JSON.stringify(record));
        const result = await ConfirmationModal.open({
            // `label` is not included here in this example.
            // it is set on lightning-modal-header instead
            size: 'medium',
            description: 'Accessible description of modal\'s purpose',
            accountId: record.Id,
            content: 'Are you sure you want to delete account with name: ' +record.Name+ '?',
            wiredAccountList: this.wiredAccountList
        });        
    }
    
    async handleSave(event) {
        // Convert datatable draft values into record objects
        const updatedFields = event.detail.draftValues;
        console.log(updatedFields);
        this.draftValues = [];
        try {
            const result = await updateAccount({data: updatedFields});
            console.log(JSON.stringify("Apex update result: "+ result));
            await Promise.all(result);

            this.dispatchEvent(
                new ShowToastEvent({
                  title: "Success",
                  message: "Account updated",
                  variant: "success",
                }),
              );
        
              // Display fresh data in the datatable
              refreshApex(this.wiredAccountList);
             
        } 
        catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error updating the Account',
                    message: error.body.message,
                    variant: "error",
                }),
            );
        }
    }  

    handleAddAccount() {
        if (!this.newAccountName.trim()) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: 'Account name cannot be empty.',
                    variant: 'error'
                })
            );
            return;
        }
    

        insertAccounts({accountName: this.newAccountName, setActive: this.Active, setPhone: this.newPhone})
        .then(() => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Account created',
                    variant: 'success'
                })
            );
            this.newAccountName = '';
            this.showInputField = false;
            this.Active = '';
            this.newPhone = '';
            return refreshApex(this.wiredAccountList);
        })
        .catch(error => {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error creating account',
                    message: error.body.message,
                    variant: 'error'
                })
            );
        });
    }

    handleChange(event) {
        this.currentUserName = event.target.value;
    }

    handleNameChange(event) {
        this.newAccountName = event.target.value;
        console.log(this.newAccountName);
    }

    handleActiveChange(event) {
        this.Active = event.target.value;
        console.log(this.newPhone);
    }

    handlePhoneChange(event) {
        this.newPhone = event.target.value;
        console.log(this.newPhone);
    }

    toggleInputField() {
        this.showInputField = !this.showInputField;
    }
}