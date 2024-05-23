trigger MyFirstAccountTrigger on Account (before insert, after insert) {

    if (Trigger.isBefore) {
        if (Trigger.isInsert) {
            for (Account newAccount : trigger.new) {
                if ((String) newAccount.get('Rating') == null) {
                    Account accountToInsert = new Account();
                    newAccount.Rating = 'Hot'; 
                }
            }
        }
    }

    if (Trigger.isAfter) {
        for (Account newAccount : trigger.new) {
            Contact newContact = new Contact();

            newContact.LastName = newAccount.Name + ' Primary Contact';
            newContact.AccountId = newAccount.id;
            insert newContact;
        }
    }
}