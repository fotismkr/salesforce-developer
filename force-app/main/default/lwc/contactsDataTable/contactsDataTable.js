import { LightningElement, wire, track, api } from 'lwc';
import getContacts from '@salesforce/apex/ContactsController.getContacts'; // Get all contacts from the controller
import upsertContacts from '@salesforce/apex/ContactsController.upsertContacts'; // Upsert contacts via the controller
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from "@salesforce/apex";
import FIRST_NAME from '@salesforce/schema/Contact.FirstName'; // Schema definition for the Contact's FirstName field.
import LAST_NAME from '@salesforce/schema/Contact.LastName'; // Schema definition for the Contact's LastName field.
import PHONE from '@salesforce/schema/Contact.Phone'; // Schema definition for the Contact's Phone field.
import EMAIL from '@salesforce/schema/Contact.Email'; // Schema definition for the Contact's Email field.
import searchContacts from '@salesforce/apex/ContactsController.searchContacts'; // Search contacts via the controller
import style from './contactsDataTable.css'; // Import stylesheet

// Columns configuration for the datatable
const COLS = [
    { label: FIRST_NAME.fieldApiName, fieldName: FIRST_NAME.fieldApiName, editable: true },
    // Column for the contact's first name, editable.
    { label: LAST_NAME.fieldApiName, fieldName: LAST_NAME.fieldApiName, editable: true },
     // Column for the contact's last name, editable.
    { label: PHONE.fieldApiName, fieldName: PHONE.fieldApiName, editable: true },
    // Column for the contact's phone number, editable.
    { label: EMAIL.fieldApiName, fieldName: EMAIL.fieldApiName, editable: true }
    // Column for the contact's email, editable.
];

// Columns configuration for the search datatable
const SEARCH_COLS = [
    { label: FIRST_NAME.fieldApiName, fieldName: FIRST_NAME.fieldApiName, editable: true },
    { label: LAST_NAME.fieldApiName, fieldName: LAST_NAME.fieldApiName, editable: true },
    { label: PHONE.fieldApiName, fieldName: PHONE.fieldApiName, editable: true },
    { label: EMAIL.fieldApiName, fieldName: EMAIL.fieldApiName, editable: true },
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
    // Column with a button to assign the contact to the current account.
];

export default class ContactsDataTable extends LightningElement {
    @api recordId; // Record ID from the parent component
    @track searchMessage = { title: '', message: '' }; // Search message
    @track contacts = []; // List of contacts
    @track searchKey = ''; // Search key
    @track cardTitle = { message: '' }; // Card title
    @track columns = COLS; // Datatable columns
    @track isModalOpen = false; // Modal open flag
    searchResults = false; // Search results flag
    showInputField = false; // Show input field flag
    pageSizeOptions = [5, 10, 25]; // Page size options
    pageSize; // Number of records to be displayed per page
    totalPages; // Total number of pages
    pageNumber = 1; // Page number
    totalRecords = 0; // Total number of records
    contactsList; // List of contacts to display
    wiredContactList; // Wired contact list to update for asynchronous refresh
    draftValues = []; // Draft values for inline editing
    recordsToDisplay = []; // Records to display on the current page

    // Called when the component is connected to the DOM
    connectedCallback() {
        this.pageSize = this.pageSizeOptions[0]; // Initialize page size
    }

    // Handle opening the modal
    handleOpenModal() {
        this.isModalOpen = true;
    }

    // Handle closing the modal
    handleCloseModal() {
        this.isModalOpen = false;
    }

    // Wire method to get contacts
    @wire(getContacts, { recordId: '$recordId' })
    wiredContacts(result) {
        this.wiredContactList = result;
        if (result.data) {
            console.log('Total contacts: ' + result.data.length);
            this.totalRecords = result.data.length;
            this.cardTitle = { message: "Current Account's Contacts" };
            this.contactsList = result.data;
            this.paginationHelper();
            console.log(this.contactsList);
        } else if (result.error) {
            console.log(result.error);
        }
    }

    /**
     * Handles saving contact changes (insert or update).
     * @param {Event} event - The event triggered by the save button.
     */
    async handleSave(event) {
        const dmlOperation = event.target.name; // Check if it is update or insert
        let upsertedFields;
        upsertedFields = dmlOperation === 'Inserted' ? this.contacts : dmlOperation === 'Updated' ? event.detail.draftValues : null;
        console.log('DML Operation: ' + dmlOperation + ' Fields: ' + JSON.stringify(upsertedFields));
        this.draftValues = [];
        try {
            const result = await upsertContacts({ data: upsertedFields, operation: dmlOperation });
            await Promise.all(result);
            console.log(JSON.stringify("Apex update result: " + result));

            this.dispatchEvent(
                new ShowToastEvent({
                    title: result[0],
                    message: result.slice(1).join('\n'),
                    variant: result[0].toLowerCase() === 'success' ? 'success' : 'error'
                }),
            );

            if (result[0].toLowerCase() === 'success') {
                if (dmlOperation === 'Inserted') {
                    // Reset new contact form
                    this.contacts = [];
                    this.showInputField = false;
                    this.columns = COLS;
                    this.searchKey = '';
                    this.searchMessage = { title: '', message: '' };
                    this.paginationHelper();
                }

                if (this.searchResults && dmlOperation === 'Updated') {
                    try {
                        console.log('Update while searched contacts');
                        const refreshSearchresult = await searchContacts({ searchKey: this.searchKey, recordId: this.recordId });
                        await Promise.all(refreshSearchresult);
                        this.contactsList = refreshSearchresult;
                        this.paginationHelper();
                    } catch (error) {
                        this.dispatchEvent(
                            new ShowToastEvent({
                                title: 'Error',
                                message: 'An error occurred while trying to fetch the updated searched results',
                                variant: 'error'
                            }),
                        );
                    }
                }

                // Display fresh data in the datatable
                this.totalRecords = this.contactsList.length;
                refreshApex(this.wiredContactList);
                this.paginationHelper();
            }
        } catch (error) {
            // Handle error in the save operation
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: error.body.message,
                    variant: 'error'
                }),
            );
        }
    }

    /**
     * Handles input changes in the search field.
     * @param {Event} event - The event triggered by the input field. 
     * Prevents the user of concurent searches to avoid server limits and conflicts
     */
    handleSearch(event) {
        this.searchKey = event.target.value;
        if (this.searchKey) {
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }
            this.searchTimeout = setTimeout(() => {
                this.performSearch();
            }, 300);
        } else {
            this.handleRefresh();
        }
    }

    /**
     * Performs the search operation for contacts.
     */
    async performSearch() {
        console.log('Contact search for: ' + JSON.stringify(this.searchKey));
        if (JSON.stringify(this.searchKey) !== '""') {
            try {
                const result = await searchContacts({ searchKey: this.searchKey, recordId: this.recordId });
                await Promise.all(result);
                let contactLength = JSON.stringify(result.length);
                console.log("Apex search result: " + JSON.stringify(result));
                console.log("Contacts length: " + contactLength);
                if (contactLength > 0) {
                    this.searchResults = true;
                    this.searchMessage = {
                        title: 'Success!',
                        message: 'Fetched ' + contactLength + ' Contacts'
                    };
                    this.cardTitle = { message: "Search results on other Accounts' Contacts" };
                    this.columns = SEARCH_COLS;
                    this.contactsList = result;
                    this.totalRecords = result.length;
                    refreshApex(this.wiredContactList);
                    this.paginationHelper();

                } else if (contactLength == 0) {
                    this.searchResults = true;
                    this.searchMessage = {
                        title: 'Warning!',
                        message: 'No Contacts with search key: ' + this.searchKey + ' found'
                    };
                    this.cardTitle = { message: "Νο other Accounts' Contacts found" };
                    this.contactsList = [];
                    this.totalRecords = 0;
                    refreshApex(this.wiredContactList);
                    this.paginationHelper();
                }
            } catch (error) {
                // Handle error in the search operation
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message: error.body.message,
                        variant: 'error'
                    }),
                );
            }
        } else {
            this.handleRefresh();
        }
    }

    /**
     * Handles refreshing the contact list.
     */
    async handleRefresh() {
        try {
            this.searchResults = false;
            this.searchMessage = { title: '', message: '' };
            const result = await getContacts({ recordId: this.recordId });
            await Promise.all(result);

            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Search cleared and Contacts datatable re-initialized',
                    variant: 'success'
                }),
            );

            this.searchKey = '';
            this.contactsList = result;
            this.totalRecords = result.length;
            refreshApex(this.wiredContactList);
            this.paginationHelper();
            this.columns = COLS;
            this.cardTitle = { message: "Current Account's Contacts" };
        } catch (error) {
            // Handle error in the refresh operation
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: error.body.message,
                    variant: 'error'
                }),
            );
        }
    }

    /**
     * Handles assigning a contact to the current account.
     * @param {Event} event - The event triggered by the assign button.
     */
    async handleAssignToAccount(event) {
        console.log(event.detail.row);
        const record = [
            {
                Id: event.detail.row.Id,
                AccountId: this.recordId
            }
        ];
        console.log('Record to be assigned to current Account: ' + JSON.stringify(record));
        try {
            const result = await upsertContacts({ data: record, operation: 'Updated' });
            await Promise.all(result);
            console.log(JSON.stringify("Apex update result: " + result));
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
            this.searchMessage = { title: '', message: '' };
            this.paginationHelper();
        } catch (error) {
            // Handle error in the assign operation
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: error.body.message,
                    variant: 'error'
                }),
            );
        }
    }

    /**
     * Handles input change in the contacts array.
     * @param {Event} event - The event triggered by the input field.
     */
    handleInputChange(event) {
        const index = event.target.dataset.index;
        const field = event.target.dataset.field;
        this.contacts[index][field] = event.target.value;
    }

    /**
     * Handles adding a new contact.
     */
    handleAddContact() {
        this.showInputField = this.contacts.length != null ? true : false;
        const newContact = { FirstName: '', LastName: '', Phone: '', Email: '' };
        newContact.AccountId = this.recordId;
        this.contacts.push(newContact);
        console.log(JSON.stringify(this.contacts));
    }

    /**
     * Handles removing a contact.
     * @param {Event} event - The event triggered by the remove button.
     */
    handleRemoveContact(event) {
        const index = event.target.dataset.index;
        this.contacts.splice(index, 1);
        console.log('Contacts length: ' + this.contacts.length);
        this.showInputField = this.contacts.length === 0 ? false : true;
    }

    /**
     * Handles changing the number of records per page.
     * @param {Event} event - The event triggered by the page size dropdown.
     */
    handleRecordsPerPage(event) {
        this.pageSize = event.target.value;
        this.paginationHelper();
    }

    /**
     * Navigates to the previous page.
     */
    previousPage() {
        this.pageNumber = this.pageNumber - 1;
        this.paginationHelper();
    }

    /**
     * Navigates to the next page.
     */
    nextPage() {
        this.pageNumber = this.pageNumber + 1;
        this.paginationHelper();
    }

    /**
     * Navigates to the first page.
     */
    firstPage() {
        this.pageNumber = 1;
        this.paginationHelper();
    }

    /**
     * Navigates to the last page.
     */
    lastPage() {
        this.pageNumber = this.totalPages;
        this.paginationHelper();
    }

    /**
     * Helper method for pagination.
     */
    paginationHelper() {
        this.recordsToDisplay = [];
        // Calculate total pages
        this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
        // Set page number 
        if (this.pageNumber <= 1) {
            this.pageNumber = 1;
        } else if (this.pageNumber >= this.totalPages) {
            this.pageNumber = this.totalPages;
        }
        // Set records to display on current page 
        for (let i = (this.pageNumber - 1) * this.pageSize; i < this.pageNumber * this.pageSize; i++) {
            if (i === this.totalRecords) {
                break;
            }
            this.recordsToDisplay.push(this.contactsList[i]);
        }
    }

    /**
     * Getter to disable the first page button.
     * @returns {boolean} - True if the first page button should be disabled.
     */
    get DisableFirst() {
        return this.pageNumber === 1;
    }

    /**
     * Getter to disable the last page button.
     * @returns {boolean} - True if the last page button should be disabled.
     */
    get DisableLast() {
        return this.pageNumber === this.totalPages;
    }
}
