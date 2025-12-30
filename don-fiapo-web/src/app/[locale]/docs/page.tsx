"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { FileText, HelpCircle, BookOpen, Shield, Code, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Link } from "@/lib/navigation";

const docSections = [
  {
    icon: FileText,
    title: "Whitepaper",
    description: "Complete technical documentation of Don Fiapo ecosystem",
    href: "/docs/whitepaper",
    color: "text-golden",
  },
  {
    icon: HelpCircle,
    title: "FAQ",
    description: "Frequently asked questions about $FIAPO",
    href: "/docs/faq",
    color: "text-blue-400",
  },
  {
    icon: BookOpen,
    title: "Getting Started",
    description: "Learn how to buy, stake, and earn with Don Fiapo",
    href: "/docs/getting-started",
    color: "text-green-500",
  },
  {
    icon: Shield,
    title: "Security",
    description: "Audit reports and security measures",
    href: "/docs/security",
    color: "text-purple-500",
  },
  {
    icon: Code,
    title: "Contracts",
    description: "Smart contract addresses and technical details",
    href: "/docs/contracts",
    color: "text-orange-500",
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold font-display text-golden mb-4">📚 Documentation</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about Don Fiapo de Manga
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {docSections.map((section, i) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={section.href}>
                  <Card className="bg-card h-full card-hover group">
                    <CardHeader>
                      <div className={`w-12 h-12 rounded-xl bg-card flex items-center justify-center mb-4 group-hover:bg-golden/10 transition-colors`}>
                        <Icon className={`w-6 h-6 ${section.color}`} />
                      </div>
                      <CardTitle className="group-hover:text-golden transition-colors flex items-center gap-2">
                        {section.title}
                        <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </CardTitle>
                      <CardDescription>{section.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
