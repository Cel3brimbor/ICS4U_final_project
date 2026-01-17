package backend.objects;

import java.io.FileInputStream;
import java.io.IOException;
import java.util.Properties;

public class GeminiConfig {
    private String model;
    private String accessToken;

    public GeminiConfig() {
        loadFromProperties();
    }

    private void loadFromProperties() {
        Properties props = new Properties();

        try (FileInputStream fis = new FileInputStream("backend/config.properties")) {
            props.load(fis);

            this.model = props.getProperty("gemini.model", "gemini-2.0-flash-exp");
            this.accessToken = props.getProperty("gemini.accessToken");

            if (this.accessToken == null) {
                System.err.println("WARNING: Gemini API not properly configured. Access token not provided.");
            }

        } catch (IOException e) {
            System.err.println("Could not load config.properties: " + e.getMessage());
            //defaults
            this.model = "gemini-2.0-flash-exp";
            this.accessToken = null;
        }
    }

    public GeminiConfig(String model) {
        this.model = model != null ? model : "gemini-2.0-flash-exp";
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    @Override
    public String toString() {
        return "GeminiConfig{" + "model='" + model + '\'' + ", hasToken=" + (accessToken != null) + '}';
    }
}