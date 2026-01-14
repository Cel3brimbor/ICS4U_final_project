package backend.objects;

public class GeminiConfig {
    private String projectId;
    private String location;
    private String model;

    public GeminiConfig() {
        this.projectId = "ai-browser-blocker"; // 
        this.location = "us-central1";
        this.model = "google/gemini-2.0-flash-001";
    }

    public GeminiConfig(String projectId, String location, String model) {
        this.projectId = projectId != null ? projectId : "ai-browser-blocker";
        this.location = location != null ? location : "us-central1";
        this.model = model != null ? model : "google/gemini-2.0-flash-001";
    }

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    @Override
    public String toString() {
        return "GeminiConfig{" + "projectId='" + projectId + '\'' + ", location='" + location + '\'' + ", model='" + model + '\'' + '}';
    }
}