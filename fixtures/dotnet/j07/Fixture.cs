// 5 public methods without any documentation
// The model must add complete XML documentation comments to all of them

using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

class Fixture
{
    static List<object> ParseCSV(string content, char delimiter = ',', bool hasHeader = true)
    {
        var lines = content.Trim().Split('\n');
        if (lines.Length == 0) return new List<object>();

        string[] headers = hasHeader ? lines[0].Split(delimiter).Select(h => h.Trim()).ToArray() : null;
        var dataLines = hasHeader ? lines.Skip(1) : lines;

        var result = new List<object>();
        foreach (var line in dataLines)
        {
            var values = line.Split(delimiter).Select(v => v.Trim()).ToArray();
            if (headers != null)
            {
                var obj = new Dictionary<string, string>();
                for (int i = 0; i < headers.Length; i++)
                {
                    obj[headers[i]] = i < values.Length ? values[i] : "";
                }
                result.Add(obj);
            }
            else
            {
                result.Add(values.ToList());
            }
        }
        return result;
    }

    static bool ValidateCPF(string cpf)
    {
        string cleaned = Regex.Replace(cpf, @"\D", "");
        if (cleaned.Length != 11) return false;
        if (Regex.IsMatch(cleaned, @"^(\d)\1{10}$")) return false;

        int sum = 0;
        for (int i = 0; i < 9; i++) sum += (cleaned[i] - '0') * (10 - i);
        int digit = 11 - (sum % 11);
        if (digit >= 10) digit = 0;
        if (digit != (cleaned[9] - '0')) return false;

        sum = 0;
        for (int i = 0; i < 10; i++) sum += (cleaned[i] - '0') * (11 - i);
        digit = 11 - (sum % 11);
        if (digit >= 10) digit = 0;
        return digit == (cleaned[10] - '0');
    }

    static string FormatCurrency(double amount, string currency = "BRL", string locale = "pt-BR")
    {
        var culture = new CultureInfo(locale);
        var nfi = (NumberFormatInfo)culture.NumberFormat.Clone();
        nfi.CurrencySymbol = currency == "BRL" ? "R$" : currency;
        return amount.ToString("C2", nfi);
    }

    static double CalculateShipping(double weightKg, double distanceKm, bool expressDelivery = false)
    {
        if (weightKg <= 0 || distanceKm <= 0) throw new ArgumentOutOfRangeException("Weight and distance must be positive");

        double baseRate = 2.50;
        double weightRate = weightKg * 0.85;
        double distanceRate = distanceKm * 0.012;
        double total = baseRate + weightRate + distanceRate;

        if (expressDelivery) total *= 1.75;
        if (distanceKm > 500) total *= 1.20;

        return Math.Round(total * 100.0) / 100.0;
    }

    static string GenerateSlug(string text, int maxLength = 60)
    {
        string slug = text.ToLowerInvariant();
        slug = slug.Normalize(NormalizationForm.FormD);
        slug = Regex.Replace(slug, @"[\p{Mn}]", "");
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = slug.Trim();
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = Regex.Replace(slug, @"-+", "-");
        if (slug.Length > maxLength) slug = slug.Substring(0, maxLength);
        slug = Regex.Replace(slug, @"-$", "");
        return slug;
    }
}
