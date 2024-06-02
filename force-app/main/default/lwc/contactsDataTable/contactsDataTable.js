import { LightningElement, wire, track, api } from 'lwc';
import getContacts from '@salesforce/apex/ContactsController.getContacts'; //get all the contact from the controller
import upsertContacts from '@salesforce/apex/ContactsController.upsertContacts'
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from "@salesforce/apex";
import FIRST_NAME from '@salesforce/schema/Contact.FirstName';
import LAST_NAME from '@salesforce/schema/Contact.LastName';
import PHONE from '@salesforce/schema/Contact.Phone';
import EMAIL from '@salesforce/schema/Contact.Email';
import searchContacts from '@salesforce/apex/ContactsController.searchContacts';

const COLS = [
    { label: FIRST_NAME.fieldApiName, fieldName: FIRST_NAME.fieldApiName, editable: true},
    { label: LAST_NAME.fieldApiName, fieldName: LAST_NAME.fieldApiName, editable: true},
    { label: PHONE.fieldApiName, fieldName: PHONE.fieldApiName, editable: true},
    { label: EMAIL.fieldApiName, fieldName: EMAIL.fieldApiName, editable: true}
]

const SEARCH_COLS = [
    { label: FIRST_NAME.fieldApiName, fieldName: FIRST_NAME.fieldApiName, editable: true},
    { label: LAST_NAME.fieldApiName, fieldName: LAST_NAME.fieldApiName, editable: true},
    { label: PHONE.fieldApiName, fieldName: PHONE.fieldApiName, editable: true},
    { label: EMAIL.fieldApiName, fieldName: EMAIL.fieldApiName, editable: true}, 
    { label: 'Assign', type: 'button',
        typeAttributes: {
            label: 'Assign',
            name: 'action_button',
            title: 'Assign',
            disabled: false,
            value: 'action',
            iconPosition: 'left'
        }
    }
]

export default class ContactsDataTable extends LightningElement {
    @api recordId;
    @track searchMessage = {
        title: '',
        message: ''
    };
    @track contacts = [];
    @track searchKey = '';
    @track cardTitle = {
        message: ''
    };
    @track columns = COLS;
    searchResults = false;
    showInputField = false;
    contactsList;
    wiredContactList; //wired contact List to update to make asychronous refresh
    draftValues = [];

    @wire(getContacts, {recordId: '$recordId'})
    wiredContacts(result) {
        this.wiredContactList = result;
        if (result.data) {
            this.cardTitle = {message: "Current Account's Contacts"};
            this.contactsList = result.data;
            console.log(this.contactsList);
        }
        else if (result.error) {
            console.log(result.error);
        }
    }
    
    async handleSave(event) {
        const dmlOperation = event.target.name; //to check if it is update or insert
        let upsertedFields;
        upsertedFields = dmlOperation == 'Inserted' ? this.contacts : dmlOperation == 'Updated' ? event.detail.draftValues : null;
        console.log('DML Operation: ' +dmlOperation+ ' Fields: ' +JSON.stringify(upsertedFields));
        this.draftValues = [];
        try {
            const result = await upsertContacts({data:upsertedFields, operation: dmlOperation});
            await Promise.all(result);
            console.log(JSON.stringify("Apex update result: "+ result));

            this.dispatchEvent(
                new ShowToastEvent({
                    title: result[0],  
                    message: result.slice(1).join('\n'), 
                    variant: result[0].toLowerCase() === 'success' ? 'success' : 'error'
                }),
            );

            if (result[0].toLowerCase() === 'success') {
                if (dmlOperation == 'Inserted') {
                    // Reset new contact form
                    this.contacts = [];
                    this.showInputField = false;
                    this.columns = COLS;
                    this.searchKey = '';
                    this.searchMessage = {title: '', message: ''};
                }

                if (this.searchResults == true && dmlOperation == 'Updated') {
                    try {
                        console.log('Update while searched contacts');
                        const refreshSearchresult = await searchContacts({searchKey: this.searchKey, recordId: this.recordId});
                        await Promise.all(refreshSearchresult);
                        this.contactsList = refreshSearchresult;
                    }
                    catch(error) {
                        this.dispatchEvent(
                            new ShowToastEvent({
                                title: 'Error',
                                message: 'An error occured while trying to fetch the updated searched results',
                                variant: 'error'
                            }),
                        );
                    }
                }
                    
                // Display fresh data in the datatable
                refreshApex(this.wiredContactList);
            }
        }
        catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: error.body.message,
                    variant: 'error'
                }),
            );
        }
    }
    
    async handleSearch(event) {
        this.searchKey = event.target.value;
        console.log('Contact search for: ' +JSON.stringify(this.searchKey));
        if (JSON.stringify(this.searchKey) != '""') {
            try {
                const result = await searchContacts({searchKey: this.searchKey, recordId: this.recordId});
                await Promise.all(result);
                let contactlength = JSON.stringify(result.length);
                console.log("Apex search result: " +JSON.stringify(result));
                console.log("Contacts length: " +contactlength);
                if (contactlength > 0 ) {
                    this.searchResults = true;
                    this.searchMessage = {
                        title: 'Success',
                        message: 'Fetched ' +contactlength +' Contacts'
                    };
                    this.cardTitle = {message: "Search results on other Accounts' Contacts"};
                    this.columns = SEARCH_COLS;
                    this.contactsList = result;
                    refreshApex(this.wiredContactList);

                }
                else if (contactlength == 0) {
                    this.searchResults = true;
                    this.searchMessage = {
                        title: 'Warning',
                        message: 'No Contacts with LIKE searchkey: ' +this.searchKey+ ' found'
                    };
                    this.cardTitle = {message: "Νο other Accounts' Contacts found"};
                    this.contactsList = [];
                    refreshApex(this.wiredContactList);
                }
            }
            catch (error) {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message: error.body.message,
                        variant: 'error'
                    }),
                );
            }
        }
        else {
            this.handleRefresh();
        }
    }

    async handleRefresh() {
        try {
            this.searchResults = false;
            this.searchMessage = {title: '', message: ''};
            const result = await getContacts({recordId: this.recordId});
            await Promise.all(result);

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Search cleared and Contacts datable re-initiliazed',
                    variant: 'success'
                }),
            );
           
            this.searchKey = '';
            this.contactsList = result;
            refreshApex(this.wiredContactList);
            this.columns = COLS;
            this.cardTitle = {message: "Current Account's Contacts"};
        }
        catch(error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: error.body.message,
                    variant: 'error'
                }),
            );
        }
    }

    async handleAssignToAccount(event) {
        console.log(event.detail.row);
        const record = [
            {
                Id: event.detail.row.Id,
                AccountId: this.recordId
            }
        ];
        console.log('Record to be assigned to current Account: ' +JSON.stringify(record));
        try {
            const result = await upsertContacts({data:record, operation: 'Updated'});
            await Promise.all(result);
            console.log(JSON.stringify("Apex update result: "+ result));
            this.dispatchEvent(
                new ShowToastEvent({
                    title: result[0],  
                    message: 'Successfully assigned Contact to current Account Record', 
                    variant: result[0].toLowerCase() === 'success' ? 'success' : 'error'
                }),
            );
            refreshApex(this.wiredContactList);
            this.columns = COLS;
            this.searchKey = '';
            this.searchResults = false;
            this.searchMessage = {title: '', message: ''};
        }
        catch(error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: error.body.message,
                    variant: 'error'
                }),
            );
        }
    }

    handleInputChange(event) {
        const index = event.target.dataset.index;
        const field = event.target.dataset.field;
        this.contacts[index][field] = event.target.value;
    }

    handleAddContact() {
        this.showInputField = this.contacts.length != null ? true : false;
        const newContact = { FirstName: '', LastName: '', Phone: '', Email: ''};
        newContact.AccountId = this.recordId;
        this.contacts.push(newContact);
        console.log(JSON.stringify(this.contacts));
    }

    handleRemoveContact(event) {
        const index = event.target.dataset.index;
        this.contacts.splice(index, 1);
        console.log('Contacts length: ' +this.contacts.length);
        this.showInputField = this.contacts.length == 0 ? false : true;
    }
}