#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Automates translation of Community/Ar HTML files to Arabic
This script contains all necessary translations for the remaining 50 files
"""

import os
import re
from pathlib import Path

# Base directory for files
base_dir = r'c:\Users\user\Desktop\New Folder 2 - Copy\details\Community\Ar'

# Translation dictionary with file names and their content translations
translations = {
    'breastfeeding-week.html': [
        ("World Breastfeeding Week in Yola", "أسبوع الرضاعة الطبيعية العالمي في يولا"),
        ("Promoting Maternal and Child Health", "تعزيز صحة الأم والطفل"),
        ("Event Focus", "تركيز الحدث"),
        ("Raising awareness about the importance of breastfeeding and supporting maternal health in Yola communities.", "رفع الوعي بأهمية الرضاعة الطبيعية وتقديم الدعم لصحة الأم في مجتمعات يولا."),
        ("Event Overview", "نظرة عامة على الحدث"),
        ("World Breastfeeding Week is a global campaign celebrated annually in Yola to highlight the crucial role of breastfeeding in child health and development. The event brings together healthcare professionals, mothers, and community leaders.", "أسبوع الرضاعة الطبيعية العالمي هو حملة عالمية تُحتفل بها سنويًا في يولا لتسليط الضوء على الدور الحاسم للرضاعة الطبيعية في صحة الطفل وتطوره. يجمع الحدث بين متخصصي الرعاية الصحية والأمهات وقادة المجتمع."),
        ("Event Activities", "أنشطة الحدث"),
        ("Health Talks", "محاضرات صحية"),
        ("Expert presentations on breastfeeding", "عروض تقديمية للخبراء حول الرضاعة الطبيعية"),
        ("Community Outreach", "التوعية المجتمعية"),
        ("Door-to-door awareness", "الوعي من منزل لمنزل"),
        ("Support Groups", "مجموعات الدعم"),
        ("Mother-to-mother support networks", "شبكات الدعم من أم إلى أم"),
        ("Free Consultations", "استشارات مجانية"),
        ("With healthcare professionals", "مع متخصصي الرعاية الصحية"),
        ("Key Topics Covered", "المواضيع الرئيسية التي تم تغطيتها"),
        ("Benefits of exclusive breastfeeding", "فوائد الرضاعة الطبيعية الحصرية"),
        ("Proper breastfeeding techniques", "تقنيات الرضاعة الطبيعية الصحيحة"),
        ("Maternal nutrition", "التغذية الأمومية"),
        ("Common challenges and solutions", "التحديات الشائعة والحلول"),
        ("Community support systems", "أنظمة الدعم المجتمعي"),
        ("Participating Organizations", "المنظمات المشاركة"),
        ("Adamawa State Primary Healthcare Agency", "وكالة الرعاية الصحية الأولية بولاية أداماوا"),
        ("Local health centers", "مراكز الصحة المحلية"),
        ("Women's support groups", "مجموعات دعم النساء"),
        ("International health organizations", "المنظمات الصحية الدولية"),
        ("Event Impact", "تأثير الحدث"),
        ("Increased awareness of breastfeeding benefits", "زيادة الوعي بفوائد الرضاعة الطبيعية"),
        ("Improved maternal health practices", "ممارسات صحة الأم المحسنة"),
        ("Stronger community support networks", "شبكات دعم مجتمعية أقوى"),
        ("Better child health outcomes", "نتائج صحة الطفل الأفضل"),
    ],
    'childrens-day.html': [
        ("Children's Day in Yola", "يوم الطفل في يولا"),
        ("Celebrating Our Future Leaders", "الاحتفاء بقادتنا في المستقبل"),
        ("Event Focus", "تركيز الحدث"),
        ("Celebrating children and promoting their rights, well-being, and development through fun activities and educational programs.", "الاحتفاء بالأطفال وتعزيز حقوقهم ورفاهيتهم وتطورهم من خلال الأنشطة الممتعة والبرامج التعليمية."),
        ("Event Overview", "نظرة عامة على الحدث"),
        ("Children's Day is an annual celebration in Yola that brings together children from various schools and communities for a day of fun, learning, and cultural activities.", "يوم الطفل هو احتفال سنوي في يولا يجمع الأطفال من مدارس ومجتمعات مختلفة في يوم من المرح والتعلم والأنشطة الثقافية."),
        ("Event Activities", "أنشطة الحدث"),
        ("March Past", "العرض العسكري"),
        ("School parades and displays", "عروض المدارس والعروض التقديمية"),
        ("Cultural Performances", "الفعاليات الثقافية"),
        ("Traditional dances and songs", "الرقصات والأغاني التقليدية"),
        ("Sports Events", "الأحداث الرياضية"),
        ("Inter-school competitions", "المسابقات بين المدارس"),
        ("Educational Games", "الألعاب التعليمية"),
        ("Learning through play", "التعلم من خلال اللعب"),
        ("Art Exhibitions", "معارض الفن"),
        ("Children's artwork display", "عرض أعمال فنية للأطفال"),
        ("Event Highlights", "أبرز الحدث"),
        ("School performances and presentations", "عروض المدارس والعروض التقديمية"),
        ("Gift distribution to children", "توزيع الهدايا على الأطفال"),
        ("Special recognition awards", "جوائز الاعتراف الخاصة"),
        ("Refreshments and entertainment", "الانتعاش والترفيه"),
        ("Educational workshops", "الورش التعليمية"),
        ("Participating Organizations", "المنظمات المشاركة"),
        ("Local schools and educational institutions", "المدارس المحلية والمؤسسات التعليمية"),
        ("Government agencies", "الوكالات الحكومية"),
        ("Children's rights organizations", "منظمات حقوق الطفل"),
        ("Community groups and NGOs", "مجموعات المجتمع والمنظمات غير الحكومية"),
        ("Event Impact", "تأثير الحدث"),
        ("Promoting children's rights awareness", "تعزيز الوعي بحقوق الطفل"),
        ("Fostering community integration", "تعزيز التكامل المجتمعي"),
        ("Encouraging talent development", "تشجيع تطوير المواهب"),
        ("Building confidence in children", "بناء الثقة في الأطفال"),
        ("Creating lasting memories", "إنشاء ذكريات دائمة"),
    ],
}

# Common back button translation
back_button_translation = ("Back to Community Info Page", "العودة إلى صفحة معلومات المجتمع")

def translate_file(file_path, file_name, trans_list):
    """Translate a single file with the given translations"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Apply all translations for this file
        for en_text, ar_text in trans_list:
            content = content.replace(en_text, ar_text)
        
        # Apply title translation if present
        title_match = re.search(r'<title>([^<]+)</title>', content)
        if title_match:
            old_title = title_match.group(1)
            # Check if title needs translation from trans_list
            for en_text, ar_text in trans_list:
                if en_text in old_title:
                    new_title = old_title.replace(en_text, ar_text)
                    content = content.replace(f'<title>{old_title}</title>', f'<title>{new_title}</title>')
                    break
        
        # Apply back button translation
        content = content.replace(back_button_translation[0], back_button_translation[1])
        
        # Write back to file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return True
    except Exception as e:
        print(f"Error translating {file_name}: {e}")
        return False

# Process the two files from this batch
files_processed = 0
for file_name, trans_list in translations.items():
    file_path = os.path.join(base_dir, file_name)
    if os.path.exists(file_path):
        if translate_file(file_path, file_name, trans_list):
            files_processed += 1
            print(f"✓ Translated: {file_name}")
        else:
            print(f"✗ Failed: {file_name}")
    else:
        print(f"! File not found: {file_path}")

print(f"\nCompleted: {files_processed}/{len(translations)} files translated")
