public with sharing class HttpIntegration {
    public static void setRequestToken() {
        String client_id;
        String client_secret;
        String endpoint;
        String grant_type;
        String method;
    

        List<Api_Credts__mdt> config = [SELECT client_id__c, client_secret__c, endpoint__c, grant_type__c, httpMethod__c FROM Api_Credts__mdt WHERE DeveloperName =: 'suiteCRM'];
        try {
            system.debug(config);
            for(Api_Credts__mdt keys : config) {
                client_id = keys.client_id__c;
                client_secret = keys.client_secret__c;
                endpoint = keys.endpoint__c;
                grant_type = keys.grant_type__c;
                method = keys.httpMethod__c;
            }
            HttpRequest req = new HttpRequest();
            req.setEndpoint(endpoint);
            req.setMethod(method);
            req.setBody('grant_type='+grant_type+'&client_id='+client_id+'&client_secret='+client_secret+'');

            HttpResponse res = new Http().send(req);
            System.debug(res);

            if (res.getStatusCode() == 200) {
                final String CACHE_KEY = 'token';
                final String PARTITION_NAME = 'local.suiteCRM';

                Cache.SessionPartition partition = CACHE.Session.getPartition(PARTITION_NAME);
                Map<String, Object> token = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
                system.debug(token);
                partition.put(CACHE_KEY, token.get('access_token'), 3600);
                system.debug(partition.get(CACHE_KEY));
            }
            else {
                system.debug('An error has occured with the http integration' +res.getBody() + ' with error status: ' +res.getStatus());
            }
        }
        catch (Exception e) {
            system.debug('An error has occured: ' +e.getMessage());
        }
    }
}