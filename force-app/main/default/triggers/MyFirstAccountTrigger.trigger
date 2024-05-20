trigger MyFirstAccountTrigger on Account (before insert, after insert) {

    if (Trigger.isBefore) {
        List<Account> accountsToInsert = new List<Account>();
        if (Trigger.isInsert) {
            for (Account newAccount : trigger.new) {
                if ((String) newAccount.get('Rating') == null) {
                    Account accountToInsert = new Account();
                    newAccount.Rating = 'Hot';
                    accountToInsert.Name = newAccount.Name;
                    accountToInsert.Id = newAccount.Id;
                    accountToInsert.Rating = newAccount.Rating;
                    accountsToInsert.add(accountToInsert);
                }
            }
        }
        insert accountsToInsert;
    }

    if (Trigger.isAfter) {
        List<Account> accountsToUpdate = new List<Account>();
        for (Account newAccount : trigger.new) {
            Account accountToUpdate = new Account();
            Contact newContact = new Contact();

            newContact.LastName = newAccount.Name + ' Primary Contact';
            newContact.AccountId = newAccount.id;
            insert newContact;

            accountToUpdate.id = newAccount.id;
            accountToUpdate.Name = newAccount.Name + ' first Test';
            accountsToUpdate.add(accountToUpdate);
        }
        update accountsToUpdate;
    }
    
    

}