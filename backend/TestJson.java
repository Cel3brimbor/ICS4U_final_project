package backend;

public class TestJson {
    public static void main(String[] args) {
        // Test JSON parsing
        String testJson = "{\"description\":\"test task\",\"startTime\":\"10:00\",\"endTime\":\"11:00\",\"date\":\"2024-01-15\"}";
        System.out.println("Testing JSON: " + testJson);

        var testRequest = FrontendDataHandler.parseTaskCreateRequest(testJson);
        if (testRequest != null) {
            System.out.println("JSON parsing test successful:");
            System.out.println("Description: " + testRequest.getDescription());
            System.out.println("Start Time: " + testRequest.getStartTime());
            System.out.println("End Time: " + testRequest.getEndTime());
            System.out.println("Date: " + testRequest.getDate());
        } else {
            System.out.println("JSON parsing test failed!");
        }
    }
}
