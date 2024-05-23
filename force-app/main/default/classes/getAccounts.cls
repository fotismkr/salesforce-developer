public class getAccounts {
    @AuraEnabled(cacheable=true)
    public static List<Account> getAccounts(String id){
        List<User> user = [SELECT Id FROM User where ID =: UserInfo.getUserId()];
        try {
            List<Account> accts = [SELECT Id, Name, Active__c, Rating, Phone FROM Account WHERE OwnerId = :user[0].id ORDER BY CreatedDate DESC LIMIT 5 ];
            return accts;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static string insertAccounts(String accountName, String setActive, String setPhone){
        if (String.isBlank(setActive)) {
            setActive = 'No'; 
        }
        try {
            Account newAccount = new Account(Name = accountName, Active__c = setActive, Phone = setPhone);
            insert newAccount;
            return 'New Account Successfully created';
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static string updateAccounts(Object data) {
        system.debug(data);
        List<Account> accountToUpdate = (List<Account>) JSON.deserialize(JSON.serialize(data), List<Account>.class);
        system.debug(accountToUpdate);
        try {
            update accountToUpdate;
            return 'Success: account updated successfully';
        }
        catch (Exception e) {
            return 'The following exception has occured: ' + e.getMessage();
        }
    }
}