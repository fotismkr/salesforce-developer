public with sharing class ContactsController {
    
    @AuraEnabled(cacheable=true)
    public static List<Contact> getContacts(String recordId){
        try {
            return [SELECT id, FirstName, LastName, Phone, Email FROM Contact WHERE AccountId = :recordId ORDER BY CreatedDate DESC Limit 10];
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static List<string> upsertContacts(Object data, String operation){
        system.debug(data);
        List<String> response = new List<String>();
        List<Contact> upsertContacts = (List<Contact>) JSON.deserialize(JSON.serialize(data), List<Contact>.class);
        try {
            upsert upsertContacts;
            response.add('Success');
            response.add('Successfully ' +operation+ ' the contacts');
            return response;
        } catch (Exception e) {
            response.add('Error');
            response.add('The following exception has occured: ' + e.getMessage());
            return response;
        }
    }

    @AuraEnabled
    public static List<Contact> searchContacts(String searchKey, String recordId){
        String key = '%' +searchKey + '%';
        try {
            return (List<Contact>)[SELECT FirstName, LastName, Phone, Email FROM Contact WHERE (FirstName LIKE :key OR LastName LIKE :key OR Phone LIKE :key OR Email Like :key) AND AccountId != :recordId];    
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}