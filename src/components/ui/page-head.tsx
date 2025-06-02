"use client";

import { useEffect } from "react";
import { siteConfig } from "@/app/metadata";

interface PageHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
}

export function PageHead({ title, description, keywords = [] }: PageHeadProps) {
  const fullTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.name;
  const fullDescription = description || siteConfig.description;
  const fullKeywords = [...keywords, "simulasi", "bakteri", "mikrobiologi"];

  useEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Update or create meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", fullDescription);
    } else {
      metaDescription = document.createElement("meta");
      metaDescription.setAttribute("name", "description");
      metaDescription.setAttribute("content", fullDescription);
      document.head.appendChild(metaDescription);
    }

    // Update or create meta keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute("content", fullKeywords.join(", "));
    } else {
      metaKeywords = document.createElement("meta");
      metaKeywords.setAttribute("name", "keywords");
      metaKeywords.setAttribute("content", fullKeywords.join(", "));
      document.head.appendChild(metaKeywords);
    }

    // Update Open Graph title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute("content", fullTitle);
    }

    // Update Open Graph description
    const ogDescription = document.querySelector(
      'meta[property="og:description"]'
    );
    if (ogDescription) {
      ogDescription.setAttribute("content", fullDescription);
    }
  }, [fullTitle, fullDescription, fullKeywords, keywords]);

  return null;
}
