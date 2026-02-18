// 5 public methods without any documentation
// The model must add complete Javadoc to all of them

import java.text.NumberFormat;
import java.text.Normalizer;
import java.util.*;

class Fixture {

    static List<Object> parseCSV(String content, char delimiter, boolean hasHeader) {
        String[] lines = content.trim().split("\n");
        if (lines.length == 0) return Collections.emptyList();

        String[] headers = hasHeader ? lines[0].split(String.valueOf(delimiter)) : null;
        if (headers != null) {
            for (int i = 0; i < headers.length; i++) headers[i] = headers[i].trim();
        }
        int startIndex = hasHeader ? 1 : 0;

        List<Object> result = new ArrayList<>();
        for (int row = startIndex; row < lines.length; row++) {
            String[] values = lines[row].split(String.valueOf(delimiter));
            for (int i = 0; i < values.length; i++) values[i] = values[i].trim();

            if (headers != null) {
                Map<String, String> obj = new LinkedHashMap<>();
                for (int i = 0; i < headers.length; i++) {
                    obj.put(headers[i], i < values.length ? values[i] : "");
                }
                result.add(obj);
            } else {
                result.add(Arrays.asList(values));
            }
        }
        return result;
    }

    static List<Object> parseCSV(String content) {
        return parseCSV(content, ',', true);
    }

    static boolean validateCPF(String cpf) {
        String cleaned = cpf.replaceAll("\\D", "");
        if (cleaned.length() != 11) return false;
        if (cleaned.matches("(\\d)\\1{10}")) return false;

        int sum = 0;
        for (int i = 0; i < 9; i++) sum += Character.getNumericValue(cleaned.charAt(i)) * (10 - i);
        int digit = 11 - (sum % 11);
        if (digit >= 10) digit = 0;
        if (digit != Character.getNumericValue(cleaned.charAt(9))) return false;

        sum = 0;
        for (int i = 0; i < 10; i++) sum += Character.getNumericValue(cleaned.charAt(i)) * (11 - i);
        digit = 11 - (sum % 11);
        if (digit >= 10) digit = 0;
        return digit == Character.getNumericValue(cleaned.charAt(10));
    }

    static String formatCurrency(double amount, String currency, String locale) {
        Locale loc = Locale.forLanguageTag(locale);
        NumberFormat fmt = NumberFormat.getCurrencyInstance(loc);
        java.util.Currency curr = java.util.Currency.getInstance(currency);
        fmt.setCurrency(curr);
        fmt.setMinimumFractionDigits(2);
        fmt.setMaximumFractionDigits(2);
        return fmt.format(amount);
    }

    static String formatCurrency(double amount) {
        return formatCurrency(amount, "BRL", "pt-BR");
    }

    static double calculateShipping(double weightKg, double distanceKm, boolean expressDelivery) {
        if (weightKg <= 0 || distanceKm <= 0) throw new IllegalArgumentException("Weight and distance must be positive");

        double baseRate = 2.50;
        double weightRate = weightKg * 0.85;
        double distanceRate = distanceKm * 0.012;
        double total = baseRate + weightRate + distanceRate;

        if (expressDelivery) total *= 1.75;
        if (distanceKm > 500) total *= 1.20;

        return Math.round(total * 100.0) / 100.0;
    }

    static double calculateShipping(double weightKg, double distanceKm) {
        return calculateShipping(weightKg, distanceKm, false);
    }

    static String generateSlug(String text, int maxLength) {
        String slug = text.toLowerCase();
        slug = Normalizer.normalize(slug, Normalizer.Form.NFD);
        slug = slug.replaceAll("[\\p{InCombiningDiacriticalMarks}]", "");
        slug = slug.replaceAll("[^a-z0-9\\s-]", "");
        slug = slug.trim();
        slug = slug.replaceAll("\\s+", "-");
        slug = slug.replaceAll("-+", "-");
        if (slug.length() > maxLength) slug = slug.substring(0, maxLength);
        slug = slug.replaceAll("-$", "");
        return slug;
    }

    static String generateSlug(String text) {
        return generateSlug(text, 60);
    }
}
