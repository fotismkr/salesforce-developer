trigger MyFirstAccountTrigger on Account (after insert) {
    List<Account> accountsToUpdate = new List<Account>();

    for (Account newAccount : trigger.new) {
        Account accountToUpdate = new Account();
        Contact newContact = new Contact();

        newContact.LastName = 'Makridis';
        newContact.FirstName = 'Fotis';
        newContact.AccountId = newAccount.id;
        insert newContact;

        accountToUpdate.id = newAccount.id;
        accountToUpdate.Name = newAccount.Name + ' first Test';
        accountsToUpdate.add(accountToUpdate);
    }
    
    update accountsToUpdate;

}