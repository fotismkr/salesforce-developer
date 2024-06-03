public with sharing class ContactsController {

    // Apex method to get contacts for a specific account
    @AuraEnabled(cacheable=true)
    public static List<Contact> getContacts(String recordId) {
        try {
            // SOQL query to fetch contacts related to the given account ID, ordered by creation date
            return [SELECT id, FirstName, LastName, Phone, Email FROM Contact WHERE AccountId = :recordId ORDER BY CreatedDate DESC Limit 1000];
        } catch (Exception e) {
            // Handle exceptions by throwing a user-friendly error message
            throw new AuraHandledException(e.getMessage());
        }
    }

    // Apex method to upsert (insert or update) contacts
    @AuraEnabled
    public static List<string> upsertContacts(Object data, String operation) {
        system.debug(data); // Debug statement to log the incoming data
        List<String> response = new List<String>(); // Response list to hold the result messages
        List<Contact> upsertContacts = (List<Contact>) JSON.deserialize(JSON.serialize(data), List<Contact>.class); // Deserialize the JSON data to a list of Contact objects
        try {
            // Upsert the contacts (insert or update)
            upsert upsertContacts;
            response.add('Success'); // Add success message to the response list
            system.debug('Total DML Statements made: ' + Limits.getDmlStatements()); // Debug statement to log the number of DML statements made
            system.debug('Total Allowed DML Statements: ' + Limits.getLimitDmlStatements()); // Debug statement to log the allowed number of DML statements
            response.add('Successfully ' + operation + ' the contacts'); // Add detailed success message to the response list
            return response; // Return the response list
        } catch (Exception e) {
            // Handle exceptions and add error messages to the response list
            response.add('Error');
            response.add('The following error has occurred: ' + e.getMessage());
            return response;
        }
    }

    // Apex method to search contacts based on a search key, excluding contacts of the specified account
    @AuraEnabled
    public static List<Contact> searchContacts(String searchKey, String recordId) {
        String key = '%' + searchKey + '%'; // Format the search key for a LIKE query
        List<Contact> searchContacts = new List<Contact>(); // List to hold the search results
        try {
            // SOQL query to search for contacts whose fields match the search key, excluding the specified account's contacts
            searchContacts = [SELECT FirstName, LastName, Phone, Email FROM Contact WHERE (FirstName LIKE :key OR LastName LIKE :key OR Phone LIKE :key OR Email Like :key) AND AccountId != :recordId Limit 1000];
            system.debug('Total Queries made: ' + Limits.getQueries()); // Debug statement to log the number of queries made
            return searchContacts; // Return the list of matching contacts
        } catch (Exception e) {
            // Handle exceptions by throwing a user-friendly error message
            throw new AuraHandledException(e.getMessage());
        }
    }
}
