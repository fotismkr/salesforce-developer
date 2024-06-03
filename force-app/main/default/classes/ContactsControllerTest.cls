@isTest
public class ContactsControllerTest {
    
    // Test method for getContacts
    @isTest
    static void testGetContacts() {
        // Create test account
        Account testAccount = new Account(Name = 'Test Account');
        insert testAccount;
        
        // Create test contacts
        List<Contact> testContacts = new List<Contact>();
        for (Integer i = 0; i < 5; i++) {
            testContacts.add(new Contact(FirstName = 'Test', LastName = 'Contact' + i, Phone = '1234567890', Email = 'test' + i + '@example.com', AccountId = testAccount.Id));
        }
        insert testContacts;
        
        // Test the getContacts method
        Test.startTest();
        List<Contact> contacts = ContactsController.getContacts(testAccount.Id);
        Test.stopTest();
        
        // Verify the results
        System.assertEquals(5, contacts.size(), 'Expected to retrieve 5 contacts');
        System.assertEquals('Test', contacts[0].FirstName, 'Expected the first name of the first contact to be Test');
    }

    // Test method for upsertContacts
    @isTest
    static void testUpsertContacts() {
        // Create test account
        Account testAccount = new Account(Name = 'Test Account');
        insert testAccount;
        
        // Create test contacts
        List<Contact> testContacts = new List<Contact>();
        for (Integer i = 0; i < 5; i++) {
            testContacts.add(new Contact(FirstName = 'Test', LastName = 'Contact' + i, Phone = '1234567890', Email = 'test' + i + '@example.com', AccountId = testAccount.Id));
        }
        
        // Test the upsertContacts method
        Test.startTest();
        List<String> response = ContactsController.upsertContacts(testContacts, 'Inserted');
       
        // Verify the results
        System.assertEquals('Success', response[0], 'Expected the response to contain Success');
        System.assert(response.contains('Successfully Inserted the contacts'), 'Expected the response to indicate successful insertion');
        
        // Verify the contacts were inserted
        List<Contact> insertedContacts = [SELECT Id FROM Contact WHERE AccountId = :testAccount.Id];
        System.assertEquals(5, insertedContacts.size(), 'Expected 5 contacts to be inserted');
        
        // Make an update editing emails to values that will trigger validation rule for email and trigger the exception
        for (Integer i = 0; i < 5; i++) {
            testContacts[i].Email = 'test' +i;
        }
       	response = ContactsController.upsertContacts(testContacts, 'Updated');
        Test.stopTest();
        System.assertEquals('Error', response[0], 'Expected to throw an error response');
    }

    // Test method for searchContacts
    @isTest
    static void testSearchContacts() {
        // Create test account
        Account testAccount = new Account(Name = 'Test Account');
        insert testAccount;
        
        // Create another test account
        Account anotherTestAccount = new Account(Name = 'Another Test Account');
        insert anotherTestAccount;
        
        // Create test contacts for both accounts
        List<Contact> testContacts = new List<Contact>();
        for (Integer i = 0; i < 5; i++) {
            testContacts.add(new Contact(FirstName = 'Test', LastName = 'Contact' + i, Phone = '1234567890', Email = 'test' + i + '@example.com', AccountId = testAccount.Id));
        }
        for (Integer i = 0; i < 5; i++) {
            testContacts.add(new Contact(FirstName = 'Search', LastName = 'Contact' + i, Phone = '0987654321', Email = 'search' + i + '@example.com', AccountId = anotherTestAccount.Id));
        }
        insert testContacts;
        
        // Test the searchContacts method
        Test.startTest();
        List<Contact> searchResults = ContactsController.searchContacts('Search', testAccount.Id);
        Test.stopTest();
        
        // Verify the results
        System.assertEquals(5, searchResults.size(), 'Expected to retrieve 5 contacts');
        System.assertEquals('Search', searchResults[0].FirstName, 'Expected the first name of the first contact to be Search');
    }
}