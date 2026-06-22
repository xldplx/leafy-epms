
const supabase = require('./config/db');

async function checkSupabaseTables() {
    console.log("=== CHECKING MATERIALS TABLE ===");
    try {
        const { data: materialsData, error: materialsError } = await supabase
            .from('materials')
            .select('*')
            .limit(5);

        if (materialsError) {
            console.error("ERROR fetching materials:", materialsError);
        } else {
            if (materialsData.length > 0) {
                console.log("Sample material:", materialsData[0]);
                console.log("Materials columns:", Object.keys(materialsData[0]));
            } else {
                console.log("Materials table is empty!");
            }
        }
    } catch (err) {
        console.error("Exception fetching materials:", err);
    }

    console.log("\n=== CHECKING EQUIPMENT TABLE ===");
    try {
        const { data: equipmentData, error: equipmentError } = await supabase
            .from('equipment')
            .select('*')
            .limit(5);

        if (equipmentError) {
            console.error("ERROR fetching equipment:", equipmentError);
        } else {
            if (equipmentData.length > 0) {
                console.log("Sample equipment:", equipmentData[0]);
                console.log("Equipment columns:", Object.keys(equipmentData[0]));
            } else {
                console.log("Equipment table is empty!");
            }
        }
    } catch (err) {
        console.error("Exception fetching equipment:", err);
    }

    console.log("\n=== TRY SIMPLE INSERT WITH JUST PROJECT_ID ===");
    try {
        const { data: newMaterial, error: insertErr } = await supabase
            .from('materials')
            .insert([{ project_id: 1 }])
            .select();

        if (insertErr) {
            console.error("ERROR inserting test material:", insertErr);
        } else {
            console.log("Success inserting test material:", newMaterial);
            // Cleanup
            await supabase.from('materials').delete().eq('id', newMaterial[0].id);
        }
    } catch (err) {
        console.error("Exception inserting test material:", err);
    }
}

checkSupabaseTables();
